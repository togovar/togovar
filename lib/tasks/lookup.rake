namespace :lookup do
  namespace :mongo do
    desc 'drop the collection'
    task drop: :environment do
      Lookup.collection.drop
    end

    desc 'create index on lookup'
    task create_index: :environment do
      Lookup.index({ tgv_id: 1 }, unique: true)
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
    desc 'import basic information'
    task :import, ['path'] => :environment do |task, args|
      file = args[:path] || raise("Usage: rake #{task.name}[file_path]")
      raise("Cannot open #{file}") unless File.file?(file)

      require 'tasks/lookup/vep/importer'

      log_file = File.join(Rails.root, 'log', "rake_#{task.name.tr(':', '_')}.#{Rails.env}.log")

      Tasks::Lookup::Vep::Importer.logger = Logger.new(log_file, 'daily')

      Tasks::Lookup::Vep::Importer.import(file, progress: STDOUT.tty?)
    end
  end

  namespace :clinvar do
    desc 'fetch ClinVar information'
    task :fetch, ['path'] => :environment do |task, args|
      file = args[:path] || raise("Usage: rake #{task.name}[file_path]")
      raise("Cannot open #{file}") unless File.file?(file)

      require 'tasks/lookup/clin_var/disease'

      Rails.logger = Logger.new(File::NULL)

      disease         = Tasks::Lookup::ClinVar::Disease.new
      disease.alleles = File.readlines(file).map(&:chomp)

      disease.tsv
    end

    desc 'merge ClinVar information into TogoVar'
    task :merge_tgv, %w[path_to_id_map path_to_disease_list] => :environment do |task, args|
      file1 = args[:path_to_id_map] || raise("Usage: rake #{task.name}[file_path]")
      raise("Cannot open #{file1}") unless File.file?(file1)

      file2 = args[:path_to_disease_list] || raise("Usage: rake #{task.name}[file_path]")
      raise("Cannot open #{file2}") unless File.file?(file2)

      require 'csv'

      allele_to_tgv = File.readlines(file1).map { |x| x.chomp.split.reverse }.to_h

      tsv = CSV.generate(col_sep: "\t") do |tsv|
        CSV.foreach(file2, col_sep: "\t").each do |row|
          allele_id = row[0]
          tsv << [allele_to_tgv[allele_id], *row]
        end
      end
      puts tsv
    end

    desc 'import ClinVar information'
    task :import, ['path'] => :environment do |task, args|
      file = args[:path] || raise("Usage: rake #{task.name}[file_path]")
      raise("Cannot open #{file}") unless File.file?(file)

      require 'tasks/lookup/clin_var/importer'

      log_file = File.join(Rails.root, 'log', "rake_#{task.name.tr(':', '_')}.#{Rails.env}.log")

      Tasks::Lookup::ClinVar::Importer.logger = Logger.new(log_file, 'daily')

      Tasks::Lookup::ClinVar::Importer.import(file, progress: STDOUT.tty?)
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
