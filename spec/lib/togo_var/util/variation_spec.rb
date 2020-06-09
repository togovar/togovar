require 'rails_helper'

RSpec.describe TogoVar::Util::Variation do
  describe 'vcf_to_refsnp_location' do
    def conversion(pos, ref, alt)
      TogoVar::Util::Variation.vcf_to_refsnp_location(pos, ref, alt)
    end

    context 'SNV' do
      it { expect(conversion(61811, 'A', 'G')).to eq([61811, 61811, 'A', 'G']) }
    end

    context 'insertion' do
      it { expect(conversion(61535, 'G', 'GTTATTCA')).to eq([61535, 61536, '', 'TTATTCA']) }
    end

    context 'deletion' do
      it { expect(conversion(10072, 'AACCCT', 'A')).to eq([10073, 10077, 'ACCCT', '']) }
    end

    context 'indel' do
      it { expect(conversion(10149, 'CCTA', 'CA')).to eq([10150, 10152, 'CTA', 'A']) }
      it { expect(conversion(61846, 'CT', 'CTTTT')).to eq([61847, 61847, 'T', 'TTTT']) }
      it { expect(conversion(1273413, 'TAGGCAGG', 'C')).to eq([1273413, 1273420, 'TAGGCAGG', 'C']) }
      it { expect(conversion(17355207, 'T', 'CC')).to eq([17355207, 17355207, 'T', 'CC']) }
    end
  end
end
