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
    desc 'convert VEP annotation'
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
    desc 'convert ClinVar data'
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
    desc 'convert ExAC data'
    task :convert, %w[in out] => :environment do |task, args|
      file_in  = args[:in] || raise("Usage: rake #{task.name}[in out]")
      file_out = args[:out] || "#{File.basename(file_in)}.nt"

      require 'tasks/lookup/ex_ac/converter'

      log_file = File.join(Rails.root, 'log', "rake_#{task.name.tr(':', '_')}.#{Rails.env}.log")

      Tasks::Lookup::ExAC::Converter.logger = Logger.new(log_file, 'daily')
      Rails.logger                          = Tasks::Lookup::ExAC::Converter.logger

      File.open(file_out, 'w') do |file|
        RDF::Writer.for(file_name: file_out).new(file) do |writer|
          Tasks::Lookup::ExAC::Converter.convert(file_in, progress: STDOUT.tty?) do |rdf|
            writer << rdf
          end
        end
      end
    end
  end

  namespace :jga do
    namespace :ngs do
      desc 'convert JGA-NGS data'
      task :convert, %w[in out] => :environment do |task, args|
        file_in  = args[:in] || raise("Usage: rake #{task.name}[in out]")
        file_out = args[:out] || "#{File.basename(file_in)}.nt"

        require 'tasks/lookup/jga/ngs/converter'

        log_file = File.join(Rails.root, 'log', "rake_#{task.name.tr(':', '_')}.#{Rails.env}.log")

        Tasks::Lookup::JGA::NGS::Converter.logger = Logger.new(log_file, 'daily')
        Rails.logger                              = Tasks::Lookup::JGA::NGS::Converter.logger

        File.open(file_out, 'w') do |file|
          RDF::Writer.for(file_name: file_out).new(file) do |writer|
            Tasks::Lookup::JGA::NGS::Converter.convert(file_in, progress: STDOUT.tty?) do |rdf|
              writer << rdf
            end
          end
        end
      end
    end
    namespace :snp do
      desc 'convert JGA-SNP data'
      task :convert, %w[in out] => :environment do |task, args|
        file_in  = args[:in] || raise("Usage: rake #{task.name}[in out]")
        file_out = args[:out] || "#{File.basename(file_in)}.nt"

        require 'tasks/lookup/jga/snp/converter'

        log_file = File.join(Rails.root, 'log', "rake_#{task.name.tr(':', '_')}.#{Rails.env}.log")

        Tasks::Lookup::JGA::SNP::Converter.logger = Logger.new(log_file, 'daily')
        Rails.logger                              = Tasks::Lookup::JGA::SNP::Converter.logger

        File.open(file_out, 'w') do |file|
          RDF::Writer.for(file_name: file_out).new(file) do |writer|
            Tasks::Lookup::JGA::SNP::Converter.convert(file_in, progress: STDOUT.tty?) do |rdf|
              writer << rdf
            end
          end
        end
      end
    end
  end

  namespace :hgvd do
    desc 'convert HGVD data'
    task :convert, %w[in out] => :environment do |task, args|
      file_in  = args[:in] || raise("Usage: rake #{task.name}[in out]")
      file_out = args[:out] || "#{File.basename(file_in)}.nt"

      require 'tasks/lookup/hgvd/converter'

      log_file = File.join(Rails.root, 'log', "rake_#{task.name.tr(':', '_')}.#{Rails.env}.log")

      Tasks::Lookup::HGVD::Converter.logger = Logger.new(log_file, 'daily')
      Rails.logger                          = Tasks::Lookup::HGVD::Converter.logger

      File.open(file_out, 'w') do |file|
        RDF::Writer.for(file_name: file_out).new(file) do |writer|
          Tasks::Lookup::HGVD::Converter.convert(file_in, progress: STDOUT.tty?) do |rdf|
            writer << rdf
          end
        end
      end
    end
  end
end
