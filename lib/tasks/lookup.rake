namespace :lookup do
  desc 'drop the collection'
  task drop: :environment do
    Lookup.collection.drop
  end

  desc 'create index on lookup'
  task create_index: :environment do
    Lookup.index({ tgv_id: 1 }, unique: true)
    Lookup.create_indexes
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
