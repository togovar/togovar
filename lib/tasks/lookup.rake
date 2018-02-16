namespace :lookup do
  namespace :base do
    desc 'import basic information'
    task :import, ['path'] => :environment do |task, args|
      file = args[:path] || raise("Usage: rake #{task.name}[file_path]")
      raise("Cannot open #{file}") unless File.file?(file)

      require 'tasks/lookup/base/importer'

      log_file = File.join(Rails.root, 'log', "rake_#{task.name.tr(':', '_')}.#{Rails.env}.log")
      Tasks::Lookup::Base::Importer.logger = Logger.new(log_file, 'daily')

      Tasks::Lookup::Base::Importer.import(file, progress: STDOUT.tty?)
    end
  end
end
