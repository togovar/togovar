class FileSize
  BYTE     = 1024
  MEGABYTE = BYTE**2
  GIGABYTE = BYTE**3

  attr_reader :byte

  def initialize(byte)
    @byte = byte
  end

  def pretty
    return 'N/A' unless @byte

    base, unit = base_unit
    "#{(@byte / base).round(2).to_s(:delimited)} #{unit}"
  end

  private

  def base_unit
    if @byte >= GIGABYTE
      [GIGABYTE, 'GB']
    elsif @byte >= MEGABYTE
      [MEGABYTE, 'MB']
    else
      [BYTE, 'KB']
    end
  end
end
