import chalk from "chalk";
import * as fs from "fs-extra";
import { GraphQLConfig, GraphQLProjectConfig } from "graphql-config";
import { importSchema } from "graphql-import";
import { get, has, merge } from "lodash";
import * as path from "path";
import { Arguments } from "yargs";

import {
  graphql,
  DocumentNode,
  Kind,
  ObjectTypeDefinitionNode,
  OperationTypeDefinitionNode,
  GraphQLObjectType,
  GraphQLFieldMap,
  parse
} from "graphql";
import { GraphQLSchema } from "graphql/type/schema";
import {
  buildASTSchema,
  introspectionQuery,
  printSchema
} from "graphql/utilities";

export class GenerateFragments {
  private config: GraphQLConfig;
  private fragmentsExtensionConfig: { "generate-fragments": string } | undefined;
  private projectName: string;
  private project: GraphQLProjectConfig;

  constructor(private context: any, private argv: Arguments) {}

  public async handle() {
    this.config = await this.context.getConfig();

    // Get projects
    const projects: {
      [name: string]: GraphQLProjectConfig;
    } = this.getProjectConfig();

    // Process each project
    for (const projectName of Object.keys(projects)) {
      const project: GraphQLProjectConfig = projects[projectName];

      this.setCurrentProject(project, projectName);
      // if (this.argv.bundle) {
      //   this.bundle()
      // }
      // if (this.argv.graphql) {
      this.fragments();
      // }
      this.save();
    }
  }

  private setCurrentProject(
    project: GraphQLProjectConfig,
    projectName: string
  ): void {
    this.project = project;
    this.projectName = projectName;
    this.fragmentsExtensionConfig = undefined;
  }

  private fragments() {
    let fragmentsExtensionConfig:
      | { "generate-fragments": { output: string; generator: string } }
      | undefined;

    if (
      this.argv.project ||
      (!this.argv.project &&
        (has(this.project.config, "extensions.generate-fragments") ||
          has(this.project.config, "extensions.fragments")))
    ) {
      this.context.spinner.start(
        `Generating fragments for project ${this.projectDisplayName()}...`
      );
      fragmentsExtensionConfig = this.processFragments(
        this.fragmentsExtensionConfig
          ? this.fragmentsExtensionConfig["generate-fragments"]
          : undefined
      );
      merge(this.project.extensions, fragmentsExtensionConfig);
      this.context.spinner.succeed(
        `Fragments for project ${this.projectDisplayName()} written to ${chalk.green(
          fragmentsExtensionConfig["generate-fragments"].output
        )}`
      );
    } else if (this.argv.verbose) {
      this.context.spinner.info(
        `Generate Fragments not configured for project ${this.projectDisplayName()}. Skipping`
      );
    }
  }

  private save() {
    if (this.argv.save) {
      const configFile = path.basename(this.config.configPath);
      this.context.spinner.start(
        `Saving configuration for project ${this.projectDisplayName()} to ${chalk.green(
          configFile
        )}...`
      );
      this.saveConfig();
      this.context.spinner.succeed(
        `Configuration for project ${this.projectDisplayName()} saved to ${chalk.green(
          configFile
        )}`
      );
    }
  }

  private getProjectConfig(): { [name: string]: GraphQLProjectConfig } {
    let projects: { [name: string]: GraphQLProjectConfig } | undefined;
    if (this.argv.project) {
      if (Array.isArray(this.argv.project)) {
        projects = {};
        this.argv.project.map((p: string) =>
          merge(projects, { [p]: this.config.getProjectConfig(p) })
        );
      } else {
        // Single project mode
        projects = {
          [this.argv.project]: this.config.getProjectConfig(this.argv.project)
        };
      }
    } else {
      // Process all projects
      projects = this.config.getProjects();
    }

    if (!projects) {
      throw new Error("No projects defined in config file");
    }

    return projects;
  }

  private processFragments(
    schemaPath: string | undefined
  ): { "generate-fragments": { output: string; generator: string } } {
    const generator: string = this.determineGenerator();
    // TODO: This does not support custom generators
    const extension = generator.endsWith("js") ? "js" : "graphql";
    const outputPath: string = this.determineFragmentsOutputPath(extension);
    const schema: string = this.determineInputSchema(schemaPath);

    const schemaContents: string = importSchema(schema); //******************************************* */
    const fragments: string = this.makeFragments(schemaContents, extension);

    fs.writeFileSync(outputPath, fragments, { flag: "w" });

    return {
      "generate-fragments": { output: outputPath, generator: generator }
    };
  }

  /**
   *
   */

  private indentedLine(level) {
    let line = "\n";
    for (let i = 0; i < level; i++) {
      line += "  ";
    }
    return line;
  }

  private fragmentType = {
    DEFAULT: "",
    NO_RELATIONS: "NoNesting",
    DEEP: "DeepNesting",
  };

  private makeFragments(schemaContents: string, generator: string) {
    const document: DocumentNode = parse(schemaContents, { noLocation: true });
    const ast: GraphQLSchema = buildASTSchema(document);

    const typeNames = Object.keys(ast.getTypeMap())
      .filter(
        typeName =>
          ast.getType(typeName).constructor.name === "GraphQLObjectType"
      )
      .filter(typeName => !typeName.startsWith("__"))
      .filter(typeName => typeName !== ast.getQueryType().name)
      .filter(
        typeName =>
          ast.getMutationType()
            ? typeName !== ast.getMutationType()!.name
            : true
      )
      .filter(
        typeName =>
          ast.getSubscriptionType()
            ? typeName !== ast.getSubscriptionType()!.name
            : true
      )
      .sort(
        (a, b) =>
          ast.getType(a).constructor.name < ast.getType(b).constructor.name
            ? -1
            : 1
      );


    // console.log(typeNames)

    const standardFragments = typeNames.map(typeName => {
      const type: any = ast.getType(typeName);
      const { name } = type;

      const fields: GraphQLFieldMap<any, any> = type.getFields();
      return {
        name,
        fragment: `fragment ${name} on ${name} {
  ${Object.keys(fields).map(field => {
      return this.printField(field, fields[field], ast);
    })
    .filter(field => field != null)
    .join(this.indentedLine(1))}
}
`
      };
      
    });

    const noRelationsFragments = typeNames.map(typeName => {
      const type: any = ast.getType(typeName);
      const { name } = type;

      const fields: GraphQLFieldMap<any, any> = type.getFields();
      return {
        name,
        fragment: `fragment ${name}${this.fragmentType.NO_RELATIONS} on ${name} {
  ${Object.keys(fields).map(field => {
      return this.printField(field, fields[field], ast, this.fragmentType.NO_RELATIONS);
    })
    // Some fields should not be printed, ie. fields with relations.
    // Remove those from the output by returning null from printField.
    .filter(field => field != null)
    .join(this.indentedLine(1))}
}
`
      };
      
    });
    const deepFragments = typeNames.map(typeName => {
      const type: any = ast.getType(typeName);
      const { name } = type;

      const fields: GraphQLFieldMap<any, any> = type.getFields();
      return {
        name,
        fragment: `fragment ${name}${this.fragmentType.DEEP} on ${name} {
  ${Object.keys(fields).map(field => {
      return this.printField(field, fields[field], ast, this.fragmentType.DEEP);
    })
    // Some fields should not be printed, ie. fields with relations.
    // Remove those from the output by returning null from printField.
    .filter(field => field != null)
    .join(this.indentedLine(1))}
}
`
      };
      
    });

    if (generator === 'js'){
      return `// THIS FILE HAS BEEN AUTO-GENERATED BY "graphql-cli-generate-fragments"
// DO NOT EDIT THIS FILE DIRECTLY
${standardFragments
      .map(
        ({ name, fragment }) => `
export const ${name}Fragment = \`${fragment}\`
`,
      )
  .join("")}
${noRelationsFragments
    .map(
      ({ name, fragment }) => `
export const ${name}${this.fragmentType.NO_RELATIONS}Fragment = \`${fragment}\`
`,
    )
.join("")}
${deepFragments
  .map(
    ({ name, fragment }) => `
export const ${name}${this.fragmentType.DEEP}Fragment = \`${fragment}\`
`,
  )
.join("")}
`;
}
    return `# THIS FILE HAS BEEN AUTO-GENERATED BY "graphql-cli-generate-fragments"
# DO NOT EDIT THIS FILE DIRECTLY

# Standard Fragments
# Nested fragments will spread one layer deep

${standardFragments
  .map(({ name, fragment }) => `
${fragment}`)
  .join("")}

# No Relational objects
# No nested fragments

${noRelationsFragments
  .map(({ name, fragment }) => `
${fragment}`)
  .join("")}

# Deeply nested Fragments
# Will include n nested fragments
# If there is a recursive relation you will receive a
# "Cannot spread fragment within itself" error when using

${deepFragments
  .map(({ name, fragment }) => `
${fragment}`)
  .join("")}
`
    
  }

  private printField(fieldName, field, ast: GraphQLSchema, fragmentType = this.fragmentType.DEFAULT, indent = 1) {
    let constructorName =
      field.type.constructor.name && field.type.constructor.name;
    if (constructorName === "Object")
      constructorName =
        (field.type.name &&
          ast.getType(field.type.name.value).constructor.name) ||
        null;

    if (constructorName === "GraphQLList") {
      field =
        (field.astNode.type.type.type && field.astNode.type.type.type) || null;
      constructorName = ast.getType(field.name.value).constructor.name;
      if (field === null) return null;
      // if(noRelation) return null
    }

    if (constructorName === "GraphQLNonNull" || field.kind === "NonNullType") {
      field = (field.astNode.type && field.astNode.type) || field.type;
      constructorName =
        (field.type.name &&
          ast.getType(field.type.name.value).constructor.name) ||
        null;
      if (constructorName === null) {
        field = (field.type && field.type) || null;
        constructorName =
          (field.type.name &&
            ast.getType(field.type.name.value).constructor.name) ||
          null;
      }
    }

    if (
      constructorName === "GraphQLScalarType" ||
      constructorName === "GraphQLEnumType"
    ) {
      return fieldName;
    }

    if (constructorName === "GraphQLObjectType") {
      if(fragmentType === this.fragmentType.NO_RELATIONS) return null
      let typeName = null;
      // if(field.name !== undefined)
      typeName =
        (field.name && field.name.value) ||
        ((field.type.name.value && field.type.name.value) || field.type.name);

      return (
        fieldName +
        " {" +
        this.indentedLine(indent + 1) +
        "..." +
        `${(fragmentType === this.fragmentType.DEFAULT) && typeName + this.fragmentType.NO_RELATIONS || typeName + this.fragmentType.DEFAULT}` +
        this.indentedLine(indent) +
        "}"
      );
    }

    return null;
  }

  /****************************** */

  private saveConfig() {
    if (has(this.project.config, "extensions.fragments")) {
      delete this.project.config.extensions!.fragments;
    }
    this.config.saveConfig(this.project.config, this.projectName);
  }

  /**
   * Determine input schema path for binding. It uses the resulting schema from bundling (if available),
   * then looks at bundle extension (in case bundling ran before), then takes the project schemaPath.
   * Also checks if the file exists, otherwise it throws and error.
   *
   * @param {(string | undefined)} schemaPath Schema path from bundling
   * @returns {string} Input schema path to be used for binding generation.
   */
  private determineInputSchema(schemaPath: string | undefined): string {
    const bundleDefined = has(
      this.project.config,
      "extensions.prepare-bundle.output"
    );
    const oldBundleDefined = has(
      this.project.config,
      "extensions.bundle.output"
    );
    // schemaPath is only set when bundle ran
    if (!schemaPath) {
      if (bundleDefined) {
        // Otherwise, use bundle output schema if defined
        schemaPath = get(
          this.project.config,
          "extensions.prepare-bundle.output"
        );
      } else if (oldBundleDefined) {
        schemaPath = get(this.project.config, "extensions.bundle.output");
      } else if (this.project.schemaPath) {
        // Otherwise, use project schemaPath
        schemaPath = this.project.schemaPath;
      } else {
        throw new Error(`Input schema cannot be determined.`);
      }
    }

    if (fs.existsSync(schemaPath!)) {
      return schemaPath!;
    } else {
      throw new Error(
        `Schema '${schemaPath!}' not found.${
          bundleDefined ? " Did you run bundle first?" : ""
        }`
      );
    }
  }

  /**
   * Determine input schema path for bundling.
   *
   * @returns {string} Input schema path for bundling
   */
  private determineSchemaPath(): string {
    if (this.project.schemaPath) {
      return this.project.schemaPath;
    }
    throw new Error(
      `No schemaPath defined for project '${this.projectName}' in config file.`
    );
  }

  /**
   * Determine generator. Provided generator takes precedence over value from config
   *
   * @param {string} generator Command line parameter for generator
   * @returns {string} Generator to be used
   */
  private determineGenerator(): string {
    if (this.argv.generator) {
      return this.argv.generator;
    }
    if (has(this.project.config, "extensions.generate-fragments.generator")) {
      return get(
        this.project.config,
        "extensions.generate-fragments.generator"
      );
    }
    throw new Error(
      "Generator cannot be determined. No existing configuration found and no generator parameter specified."
    );
  }

  /**
   * Determine output path for fragments. Provided path takes precedence over value from config
   *
   * @param {string} extension File extension for output file
   * @returns Output path
   */
  private determineFragmentsOutputPath(extension: string) {
    let outputPath: string;
    if (this.argv.output) {
      outputPath = path.join(
        this.argv.output,
        `${this.projectName}.fragments.${extension}`
      );
    } else if (
      has(this.project.config, `extensions.generate-fragments.output`)
    ) {
      outputPath = get(
        this.project.config,
        `extensions.generate-fragments.output`
      );
    } else {
      throw new Error(
        "Output path cannot be determined. No existing configuration found and no output parameter specified."
      );
    }

    fs.ensureDirSync(path.dirname(outputPath));
    return outputPath;
  }

  private projectDisplayName = () => chalk.green(this.projectName);
}
