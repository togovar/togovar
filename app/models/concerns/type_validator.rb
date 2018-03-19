class TypeValidator < ActiveModel::EachValidator
  def validate_each(record, attribute, value)
    klass = options[:type]
    unless value.is_a?(klass)
      record.errors[attribute] << (options[:message] || "is not a #{klass}")
    end
  end
end
