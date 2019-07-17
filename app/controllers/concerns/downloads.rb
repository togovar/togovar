module Downloads
  extend ActiveSupport::Concern

  def latest_release
    return unless (public = Rails.configuration.public_dir).present?

    File.readlink(File.join(public, 'release', 'current'))
  end

  def downloads_list
    return [] unless (public = Rails.configuration.public_dir).present?

    dir = File.join(public, 'release', 'current')
    return [] unless Dir.exist?(dir)

    Array('1'..'22').concat(%w[X Y MT]).map do |chr|
      %i[frequency molecular_annotation].map do |type|
        label = format('chr %s %s', chr, type)
        file_name = format('chr_%s_%s.tsv.gz', chr, type)
        size = FileSize.new(File.size?(File.join(dir, file_name))).pretty
        href = File.join('public', 'release', 'current', file_name)

        [type, { label: label, href: href, size: size }]
      end.to_h.merge(chromosome: chr)
    end
  end
end
