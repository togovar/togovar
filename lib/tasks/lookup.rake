namespace :lookup do
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
    task import_index: :environment do |task, _|
      File.readlines('tgv_10000.txt').each_slice(500) do |g|
        LookupIndexingWorker.perform_async(*g.map { |x| x.chomp.sub('tgv', '') })
      end
    end
  end

  require 'tasks/lookup/vep/converter'
  require 'tasks/lookup/clin_var/converter'
  require 'tasks/lookup/ex_ac/converter'
  require 'tasks/lookup/jga/ngs/converter'
  require 'tasks/lookup/jga/snp/converter'
  require 'tasks/lookup/hgvd/converter'
  require 'tasks/lookup/to_m_mo/converter'

  { VEP:       Tasks::Lookup::Vep::Converter,
    ClinVar:   Tasks::Lookup::ClinVar::Converter,
    ExAC:      Tasks::Lookup::ExAC::Converter,
    'JGA-NGS': Tasks::Lookup::JGA::NGS::Converter,
    'JGA-SNP': Tasks::Lookup::JGA::SNP::Converter,
    HGVD:      Tasks::Lookup::HGVD::Converter,
    ToMMo:     Tasks::Lookup::ToMMo::Converter }.each do |k, v|
    namespace k.to_s.underscore do
      desc "convert #{k} data"
      task :convert, %w[in] => :environment do |task, args|
        file_in  = args[:in] || raise("Usage: rake #{task.name}[in out]")

        file_out = "#{File.basename(file_in)}.nt"
        file_out_json = "#{File.basename(file_in)}.jsonl"

        log_file = File.join(Rails.root, 'log', "rake_#{task.name.tr(':', '_')}.#{Rails.env}.log")

        v.logger     = Logger.new(log_file, 'daily')
        Rails.logger = v.logger

        begin
          json = File.open(file_out_json, 'w')

          File.open(file_out, 'w') do |file|
            RDF::Writer.for(file_name: file_out).new(file) do |writer|
              v.convert(file_in, progress: STDOUT.tty?) do |model|
                writer << model.to_rdf
                json.puts model.meta_json.to_json
                json.puts model.as_indexed_json.to_json
              end
            end
          end
        ensure
          json&.close
        end
      end
    end
  end
end
