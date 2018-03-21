class StanzaRuby < Settingslogic # :nodoc:
  namespace Rails.env
  source File.join(Rails.root, 'config', 'stanza_ruby.yml')

  # @return [Hash]
  def all
    flat_map { |_, stanzas| stanzas.map(&:symbolize_keys) }
  end

  # @param [Hash] args
  # @return [String, nil]
  def tag(*args)
    options = args.last.is_a?(Hash) ? args.pop : {}
    make_tag("togostanza-#{name}", options)
  end

  private

  def make_tag(tag_name, parameters = {})
    param = if parameters
              parameters.slice(*params.map(&:intern)).map do |k, v|
                %(#{k}="#{v.to_s.gsub('"'.freeze, '&quot;'.freeze)}")
              end.join(' ')
            end
    "<#{tag_name}#{" #{param}" if param.present?} />".html_safe
  end
end

