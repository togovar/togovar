class ArrayOfValidator < ActiveModel::EachValidator
  def validate_each(record, attribute, value)
    unless value.is_a?(Array)
      record.errors[attribute] << (options[:message] || 'is not an Array')
      return
    end

    klass = options[:type]
    value.each do |x|
      unless x.is_a?(klass)
        record.errors[attribute] << (options[:message] || "#{x.class} is not a #{klass}")
      end
    end
  end
end
