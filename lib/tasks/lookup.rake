namespace :lookup do
  namespace :mongo do
    desc 'drop the collection'
    task drop: :environment do
      Lookup.collection.drop
    end

    namespace :tgv do
      desc 'create index on tgv_id'
      task create_index: :environment do
        Lookup.index({ tgv_id: 1 }, unique: true)
        Lookup.create_indexes
      end
    end

    desc 'create index on lookup'
    task create_index: :environment do
      Lookup.index({ 'molecular_annotation.symbol': 1 })
      Lookup.index({ 'clinvar_info.conditions': 1 })
      Lookup.create_indexes
    end
  end

  namespace :elastic do
    desc 'create index'
    task create_index: :environment do
      puts Lookup.elasticsearch.create_index! force: true
      puts Lookup.elasticsearch.refresh_index!
    end

    desc 'delete index'
    task delete_index: :environment do
      puts Lookup.client.indices.delete index: Lookup.index_name
    end

    desc 'import index'
    task import_index: :environment do
      puts Lookup.import
    end
  end

  namespace :vep do
    desc 'convert vep information'
    task :convert, %w[in out] => :environment do |task, args|
      file_in  = args[:in] || raise("Usage: rake #{task.name}[in out]")
      file_out = args[:out] || "#{File.basename(file_in)}.nt"

      require 'tasks/lookup/vep/converter'

      log_file = File.join(Rails.root, 'log', "rake_#{task.name.tr(':', '_')}.#{Rails.env}.log")

      Tasks::Lookup::Vep::Converter.logger = Logger.new(log_file, 'daily')
      Rails.logger                         = Tasks::Lookup::Vep::Converter.logger

      File.open(file_out, 'w') do |file|
        RDF::Writer.for(file_name: file_out).new(file) do |writer|
          Tasks::Lookup::Vep::Converter.convert(file_in, progress: STDOUT.tty?) do |rdf|
            writer << rdf
          end
        end
      end
    end
  end

  namespace :clinvar do
    desc 'convert ClinVar information'
    task :convert, %w[in out] => :environment do |task, args|
      file_in  = args[:in] || raise("Usage: rake #{task.name}[in out]")
      file_out = args[:out] || "#{File.basename(file_in)}.nt"

      require 'tasks/lookup/clin_var/converter'

      log_file = File.join(Rails.root, 'log', "rake_#{task.name.tr(':', '_')}.#{Rails.env}.log")

      Tasks::Lookup::ClinVar::Converter.logger = Logger.new(log_file, 'daily')
      Rails.logger                             = Tasks::Lookup::ClinVar::Converter.logger

      File.open(file_out, 'w') do |file|
        RDF::Writer.for(file_name: file_out).new(file) do |writer|
          Tasks::Lookup::ClinVar::Converter.convert(file_in, progress: STDOUT.tty?) do |rdf|
            writer << rdf
          end
        end
      end
    end
  end

  namespace :exac do
    desc 'import ExAC information'
    task :import, ['path'] => :environment do |task, args|
      file = args[:path] || raise("Usage: rake #{task.name}[file_path]")
      raise("Cannot open #{file}") unless File.file?(file)

      require 'tasks/lookup/ex_ac/importer'

      log_file = File.join(Rails.root, 'log', "rake_#{task.name.tr(':', '_')}.#{Rails.env}.log")

      Tasks::Lookup::ExAC::Importer.logger = Logger.new(log_file, 'daily')

      Tasks::Lookup::ExAC::Importer.import(file, progress: STDOUT.tty?)
    end
  end

  namespace :jga do
    desc 'import ExAC information'
    task :import, ['path'] => :environment do |task, args|
      file = args[:path] || raise("Usage: rake #{task.name}[file_path]")
      raise("Cannot open #{file}") unless File.file?(file)

      require 'tasks/lookup/jga/importer'

      log_file = File.join(Rails.root, 'log', "rake_#{task.name.tr(':', '_')}.#{Rails.env}.log")

      Tasks::Lookup::JGA::Importer.logger = Logger.new(log_file, 'daily')

      Tasks::Lookup::JGA::Importer.import(file, progress: STDOUT.tty?)
    end
  end
end
