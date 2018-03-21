class Stanza
  module Base
    extend ActiveSupport::Concern

    module ClassMethods
      def method_missing(sym, *args)
        name = sym.to_s
        label = args.shift
        options = args.extract_options!

        new(name, label, options)
      end
    end
  end
end
