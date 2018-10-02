module Downloads
  extend ActiveSupport::Concern

  module ClassMethods
    def download_file_path(file_name)
      base = Rails.configuration.x.download_dir
      File.join(base, 'release', 'current', file_name)
    end

    def downloads_list
      base = 'chr_%<chromosome>s_%<data>s.tsv.gz'
      Array(1..22).map(&:to_s).concat(%w[X Y MT]).map do |chr|
        hash = { chr: chr }
        %i[frequency molecular_annotation].each do |x|
          file_name = format(base, chromosome: chr, data: x)
          path      = download_file_path(file_name)
          hash[x]   = {
            label: "chr #{chr} #{x.to_s.tr('_', ' ')}",
            file:  [{ label: '.tsv',
                      name:  file_name,
                      size:  FileSize.new(File.size?(path)).pretty }]
          }
        end
        [chr, hash]
      end.to_h
    end

    private

    def current_release_dir
      return unless (base = Rails.configuration.x.download_dir)

      dir = File.join(base, 'release', 'current')

      dir if Dir.exist? dir
    end
  end

  def downloads_list
    self.class.downloads_list
  end
end
