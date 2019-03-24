module Form
  class ParameterBase
    class << self
      def register(key, label, param_name, default)
        map[key] ||= new(key: key, label: label, param_name: param_name, default: default)
      end

      def parameters
        @parameters ||= all.map(&:param_name)
      end

      def all
        map.values
      end

      def [](key)
        map[key]
      end

      def lookup(label)
        (found = map.select { |_, v| v.label == label }).present? ? found.first : nil
      end

      def defaults
        all.map { |x| [x.param_name, x.default] }.to_h.symbolize_keys
      end

      private

      def map
        @map ||= {}
      end
    end

    attr_accessor :key
    attr_accessor :label
    attr_accessor :param_name
    attr_accessor :default

    def initialize(**args)
      args.each do |k, v|
        send("#{k}=", v)
      end
    end
  end
end
