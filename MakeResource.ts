import { args, BaseCommand } from '@adonisjs/core/build/standalone'
import { join } from 'path'

export default class MakeResource extends BaseCommand {
  public static commandName = 'make:resource'

  public static description = 'Make a new resource (Model, Controller, Migration)'

  public static settings = {
    loadApp: false,
    stayAlive: false,
  }

  @args.string()
  public singularName: string

  @args.string()
  public pluralName: string

  @args.string()
  public migrationName: string

  @args.spread()
  public columns: string[]

  public async run() {
    let migrationData = ''
    this.columns.forEach((column) => {
      const [fieldName, type] = column.split(':')

      migrationData += `table.${type || 'string'}(${"'"}${fieldName}${"'"})\n      `
    })

    let modelData = ''
    this.columns.forEach((column) => {
      const [fieldName] = column.split(':')

      modelData += `@column()\n  public ${fieldName}: string\n  \n  `
    })

    let servicesNames: string[]
    const servicesMethods = ['Show', 'Index', 'Store', 'Update', 'Destroy']
    servicesNames = servicesMethods.map((method) => {
      if (method === 'Index') {
        return `${method}${this.pluralName}`
      }

      return `${method}${this.singularName}`
    })

    // generates controller
    this.generator
      .addFile(`${this.pluralName}Controller.ts`)
      .appRoot(this.application.appRoot)
      .destinationDir('app/Controllers/Http')
      .useMustache()
      .stub(join(__dirname, './templates/controller.txt'))
      .apply({ pluralName: this.pluralName, singularName: this.singularName })

    // generates migration
    this.generator
      .addFile(`${this.migrationName}.ts`, { prefix: `${String(new Date().getTime())}` })
      .appRoot(this.application.appRoot)
      .destinationDir('database/migrations')
      .stub(join(__dirname, './templates/migration.txt'))
      .apply({
        name: this.pluralName,
        columns: migrationData,
        tableName: this.pluralName.toLowerCase(),
      })

    // generates model
    this.generator
      .addFile(`${this.singularName}.ts`)
      .appRoot(this.application.appRoot)
      .destinationDir(`app/Models`)
      .stub(join(__dirname, './templates/model.txt'))
      .apply({
        name: this.singularName,
        columns: modelData,
      })

    // generates services
    servicesNames.forEach((serviceName) => {
      this.generator
        .addFile(`${serviceName}Service.ts`)
        .appRoot(this.application.appRoot)
        .destinationDir(`app/Services/${this.pluralName}`)
        .useMustache()
        .stub(join(__dirname, './templates/service.txt'))
        .apply({
          prefix: serviceName,
        })
    })

    await this.generator.run()
  }
}
