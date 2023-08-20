require 'rails_helper'

RSpec.describe "Suggests", type: :request do
  describe "GET /index" do
    it 'suggests BRCA2' do
      get "/suggest", params: { term: 'BRCA2' }, headers: { Accept: "application/json" }

      expect(response).to have_http_status(:ok)
      expect(response.content_type).to eq('application/json; charset=utf-8')

      json = JSON.parse(response.body)
      expect(json.keys).to match_array(%w[gene disease])
      expect(json['gene']).to include('term' => 'BRCA2', 'alias_of' => nil)
    end

    it 'suggests Breast-ovarian cancer, familial 1' do
      get "/suggest", params: { term: 'breast-ovarian' }, headers: { Accept: "application/json" }

      expect(response).to have_http_status(:ok)
      expect(response.content_type).to eq('application/json; charset=utf-8')

      json = JSON.parse(response.body)
      expect(json.keys).to match_array(%w[gene disease])
      expect(json['disease']).to include('term' => 'Breast-ovarian cancer, familial 1')
    end
  end
end
