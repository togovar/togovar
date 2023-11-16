require 'rails_helper'

require 'csv'
require 'json'

RSpec.describe 'API::Downloads', type: :request do
  module Headers
    GRCH37 = %w[tgv_id rs chromosome position_grch37 reference alternate type gene consequence condition
                sift_qualitative_prediction sift_score polyphen2_qualitative_prediction polyphen2_score
                alphamissense_pathogenicity alphamissense_score
                jga_ngs_allele_alt jga_ngs_allele_total jga_ngs_alt_allele_freq jga_ngs_qc_status
                jga_snp_allele_alt jga_snp_allele_total jga_snp_alt_allele_freq jga_snp_genotype_alt_alt
                jga_snp_genotype_ref_alt jga_snp_genotype_ref_ref jga_snp_qc_status
                tommo_allele_alt tommo_allele_total tommo_alt_allele_freq tommo_qc_status
                hgvd_allele_alt hgvd_allele_total hgvd_alt_allele_freq hgvd_qc_status
                gem_j_wga_allele_alt gem_j_wga_allele_total gem_j_wga_alt_allele_freq gem_j_wga_qc_status
                gnomad_genomes_allele_alt gnomad_genomes_allele_total gnomad_genomes_alt_allele_freq gnomad_genomes_qc_status
                gnomad_exomes_allele_alt gnomad_exomes_allele_total gnomad_exomes_alt_allele_freq gnomad_exomes_qc_status]
    GRCH38 = %w[tgv_id rs chromosome position_grch38 reference alternate type gene consequence condition
                sift_qualitative_prediction sift_score polyphen2_qualitative_prediction polyphen2_score
                alphamissense_pathogenicity alphamissense_score
                jga_ngs_allele_alt jga_ngs_allele_total jga_ngs_alt_allele_freq jga_ngs_qc_status
                jga_snp_allele_alt jga_snp_allele_total jga_snp_alt_allele_freq jga_snp_genotype_alt_alt
                jga_snp_genotype_ref_alt jga_snp_genotype_ref_ref jga_snp_qc_status
                tommo_allele_alt tommo_allele_total tommo_alt_allele_freq tommo_qc_status
                hgvd_allele_alt hgvd_allele_total hgvd_alt_allele_freq hgvd_qc_status
                gem_j_wga_allele_alt gem_j_wga_allele_total gem_j_wga_alt_allele_freq gem_j_wga_qc_status
                gnomad_genomes_allele_alt gnomad_genomes_allele_total gnomad_genomes_alt_allele_freq gnomad_genomes_qc_status]
  end

  let :headers do
    case ENV['TOGOVAR_REFERENCE']
    when 'GRCh37'
      Headers::GRCH37
    when 'GRCh38'
      Headers::GRCH38
    else
      pending("TOGOVAR_REFERENCE is not set.")
    end
  end

  describe 'GET /api/download/variant' do
    let(:params) do
      { term: 'tgv56616325' }
    end

    it 'download json' do
      get '/api/download/variant', params: params, headers: { Accept: 'application/json' }

      expect(response).to have_http_status(:ok)
      expect(response.content_type).to eq('application/json; charset=utf-8')

      json = JSON.parse(response.body)
      expect(json.keys).to match_array(%w[data])
      expect((variant = json['data'].find { |x| x['tgv_id'] == 'tgv56616325' })).to be_present
      expect(variant.keys).to contain_exactly(*headers)
    end

    it 'download csv' do
      get '/api/download/variant', params: params, headers: { Accept: 'text/csv' }

      expect(response).to have_http_status(:ok)
      expect(response.content_type).to eq('text/csv; charset=utf-8')

      csv = CSV.new(response.body, headers: true)
      expect(csv.find { |x| x['tgv_id'] == 'tgv56616325' }).to be_present
      expect(csv.headers).to contain_exactly(*headers)
    end

    it 'download tsv' do
      get '/api/download/variant', params: params, headers: { Accept: 'text/plain' }

      expect(response).to have_http_status(:ok)
      expect(response.content_type).to eq('text/tab-separated-values; charset=utf-8')

      tsv = CSV.new(response.body, headers: true, col_sep: "\t")
      expect(tsv.find { |x| x['tgv_id'] == 'tgv56616325' }).to be_present
      expect(tsv.headers).to contain_exactly(*headers)
    end
  end

  describe 'POST /api/download/variant' do
    let(:body) do
      { query: { id: ["tgv56616325"] } }.to_json
    end

    it 'download json' do
      post '/api/download/variant', params: body, headers: { Accept: 'application/json', 'Content-Type': 'application/json' }

      expect(response).to have_http_status(:ok)
      expect(response.content_type).to eq('application/json; charset=utf-8')

      json = JSON.parse(response.body)
      expect(json.keys).to match_array(%w[data])
      expect((variant = json['data'].find { |x| x['tgv_id'] == 'tgv56616325' })).to be_present
      expect(variant.keys).to contain_exactly(*headers)
    end

    it 'download csv' do
      post '/api/download/variant', params: body, headers: { Accept: 'text/csv', 'Content-Type': 'application/json' }

      expect(response).to have_http_status(:ok)
      expect(response.content_type).to eq('text/csv; charset=utf-8')

      csv = CSV.new(response.body, headers: true)
      expect(csv.find { |x| x['tgv_id'] == 'tgv56616325' }).to be_present
      expect(csv.headers).to contain_exactly(*headers)
    end

    it 'download tsv' do
      post '/api/download/variant', params: body, headers: { Accept: 'text/plain', 'Content-Type': 'application/json' }

      expect(response).to have_http_status(:ok)
      expect(response.content_type).to eq('text/tab-separated-values; charset=utf-8')

      tsv = CSV.new(response.body, headers: true, col_sep: "\t")
      expect(tsv.find { |x| x['tgv_id'] == 'tgv56616325' }).to be_present
      expect(tsv.headers).to contain_exactly(*headers)
    end
  end
end
