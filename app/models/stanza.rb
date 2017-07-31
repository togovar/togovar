class Stanza < Settingslogic
  source Rails.root.join(*%w(config stanza.yml)).to_s
  namespace Rails.env

  def ids
    providers.flat_map {|_report_type, stanzas| stanzas['togostanza'].map {|stanza| stanza['uri'].split('/').last } }
  end

  def all
    providers.flat_map {|report_type, stanzas|
      stanzas['togostanza'].map {|stanza|
        id = stanza['uri'].split('/').last
        stanza.merge('report_type' => report_type, 'id' => id, 'uri' => stanza['uri'])
      }
    }
  end
end
