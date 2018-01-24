import { GenerateFragments } from './GenerateFragments'
import { CommandBuilder } from 'yargs'

const command: {
  command: string
  describe?: string
  handler: (context: any, argv: any) => any
  builder?: CommandBuilder
} = {
  command: 'generate-fragments',
  describe: 'Generate fragments',

  builder: {
    output: {
      alias: 'o',
      describe: 'Output folder',
      type: 'string'
    },
    save: {
      alias: 's',
      describe: 'Save settings to config file',
      type: 'boolean',
      default: 'false'
    },
    // js: {
    //   describe: 'Generate fields to js',
    //   type: 'boolean',
    //   default: 'false'
    // },
    // graphql: {
    //   describe: 'Generate fragments to graphql',
    //   type: 'boolean',
    //   default: 'true'
    // },
    generator: {
      alias: 'g',
      describe: "Generate to 'js' or 'graphq'",
      type: 'string'
    },
    verbose: {
      describe: 'Show verbose output messages',
      type: 'boolean',
      default: 'false'
    }
  },

  handler: async (context: any, argv) => {
    // if (!argv.graphql && !argv.js) {
    //   argv.graphql = argv.js = true
    // }

    const generateFragments = new GenerateFragments(context, argv)
    await generateFragments.handle()
  }
}

export = command
