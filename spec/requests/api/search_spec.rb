require 'rails_helper'

RSpec.describe 'API::Searches', type: :request do
  describe 'GET /search' do
    context 'without keyword' do
      subject { get '/search', headers: { Accept: 'application/json' } }

      let :json do
        expect(subject).to be(200)

        expect(response.content_type).to eq('application/json; charset=utf-8')

        JSON.parse(response.body)
      end

      it 'returns expected keys' do
        expect(json.keys).to contain_exactly('data', 'scroll', 'statistics')
        expect(json['scroll'].keys).to contain_exactly('limit', 'offset', 'max_rows')
        expect(json['statistics'].keys).to contain_exactly('total', 'filtered', 'dataset', 'type', 'significance', 'consequence')
        case ENV['TOGOVAR_REFERENCE']
        when 'GRCh37'
          expect(json.dig('statistics', 'dataset').keys).to contain_exactly('gem_j_wga',
                                                                            'jga_ngs',
                                                                            'jga_snp',
                                                                            'tommo',
                                                                            'hgvd',
                                                                            'gnomad_genomes',
                                                                            'gnomad_exomes',
                                                                            'clinvar')
        when 'GRCh38'
          expect(json.dig('statistics', 'dataset').keys).to contain_exactly('gem_j_wga',
                                                                            'jga_ngs',
                                                                            'jga_snp',
                                                                            'tommo',
                                                                            'hgvd',
                                                                            'gnomad_genomes',
                                                                            'clinvar')
        else
          pending("TOGOVAR_REFERENCE is not set.")
        end
        expect(json.dig('statistics', 'type').keys).to contain_exactly('SO_0001483',
                                                                       'SO_0000159',
                                                                       'SO_0000667',
                                                                       'SO_1000002',
                                                                       'SO_1000032')
        expect(json.dig('statistics', 'significance').keys).to contain_exactly('NC',
                                                                               'US',
                                                                               'LB',
                                                                               'B',
                                                                               'P',
                                                                               'LP',
                                                                               'CI',
                                                                               'NP',
                                                                               'DR',
                                                                               'O',
                                                                               'RF',
                                                                               'A',
                                                                               'AF',
                                                                               'PR',
                                                                               'AN')
        expect(json.dig('statistics', 'consequence').keys).to contain_exactly('SO_0001627',
                                                                              'SO_0001619',
                                                                              'SO_0001621',
                                                                              'SO_0001628',
                                                                              'SO_0001624',
                                                                              'SO_0001792',
                                                                              'SO_0001583',
                                                                              'SO_0001819',
                                                                              'SO_0001782',
                                                                              'SO_0001623',
                                                                              'SO_0001630',
                                                                              'SO_0001589',
                                                                              'SO_0001587',
                                                                              'SO_0001575',
                                                                              'SO_0001574',
                                                                              'SO_0001822',
                                                                              'SO_0001821',
                                                                              'SO_0001578',
                                                                              'SO_0001895',
                                                                              'SO_0001580',
                                                                              'SO_0001567',
                                                                              'SO_0002012',
                                                                              'SO_0001818',
                                                                              'SO_0001620',
                                                                              'SO_0001626',
                                                                              'SO_0002019',
                                                                              'SO_0001893')
      end

      it 'returns data' do
        expect(json['data']).to_not be_empty
      end
    end

    context 'with keyword' do
      subject { get '/search', params: params, headers: { Accept: 'application/json' } }

      let :params do
        { term: 'tgv56616325' }
      end

      let :json do
        expect(subject).to be(200)

        expect(response.content_type).to eq('application/json; charset=utf-8')

        JSON.parse(response.body)
      end

      it 'returns data' do
        expect((variant = json['data'].find { |x| x['id'] == 'tgv56616325' })).to be_present

        expect(variant.keys).to contain_exactly('id',
                                                'type',
                                                'chromosome',
                                                'position',
                                                'start',
                                                'stop',
                                                'reference',
                                                'alternate',
                                                'existing_variations',
                                                'symbols',
                                                'external_link',
                                                'significance',
                                                'most_severe_consequence',
                                                'sift',
                                                'polyphen',
                                                'alphamissense',
                                                'transcripts',
                                                'frequencies')
      end
    end

    context 'with keyword and dataset (ToMMo)' do
      subject { get '/search', params: params, headers: { Accept: 'application/json' } }

      let :params do
        {
          term: 'tgv56616325',
          'dataset[gem_j_wga]': 0,
          'dataset[jga_ngs]': 0,
          'dataset[jga_snp]': 0,
          'dataset[hgvd]': 0,
          'dataset[gnomad_genomes]': 0,
          'dataset[clinvar]': 0
        }
      end

      let :json do
        expect(subject).to be(200)

        expect(response.content_type).to eq('application/json; charset=utf-8')

        JSON.parse(response.body)
      end

      it 'returns data' do
        expect(json['data'].find { |x| x['id'] == 'tgv56616325' }).to be_present
      end
    end

    context 'with keyword and type (SNV)' do
      subject { get '/search', params: params, headers: { Accept: 'application/json' } }

      let :params do
        {
          term: 'tgv56616325',
          'type[SO_0000667]': 0,
          'type[SO_0000159]': 0,
          'type[SO_1000032]': 0,
          'type[SO_1000002]': 0
        }
      end

      let :json do
        expect(subject).to be(200)

        expect(response.content_type).to eq('application/json; charset=utf-8')

        JSON.parse(response.body)
      end

      it 'returns data' do
        expect(json['data'].find { |x| x['id'] == 'tgv56616325' }).to be_present
      end
    end

    context 'with keyword and significance (Benign)' do
      subject { get '/search', params: params, headers: { Accept: 'application/json' } }

      let :params do
        {
          term: 'tgv56616325',
          'significance[NC]': 0,
          'significance[P]': 0,
          'significance[LP]': 0,
          'significance[US]': 0,
          'significance[LB]': 0,
          'significance[CI]': 0,
          'significance[DR]': 0,
          'significance[A]': 0,
          'significance[RF]': 0,
          'significance[PR]': 0,
          'significance[AF]': 0,
          'significance[O]': 0,
          'significance[NP]': 0,
          'significance[AN]': 0
        }
      end

      let :json do
        expect(subject).to be(200)

        expect(response.content_type).to eq('application/json; charset=utf-8')

        JSON.parse(response.body)
      end

      it 'returns data' do
        expect(json['data'].find { |x| x['id'] == 'tgv56616325' }).to be_present
      end
    end

    context 'with keyword and consequence (Missense variant)' do
      subject { get '/search', params: params, headers: { Accept: 'application/json' } }

      let :params do
        {
          term: 'tgv56616325',
          'consequence[SO_0001580]': 0,
          'consequence[SO_0001907]': 0,
          'consequence[SO_0001906]': 0,
          'consequence[SO_0001589]': 0,
          'consequence[SO_0001626]': 0,
          'consequence[SO_0001822]': 0,
          'consequence[SO_0001821]': 0,
          'consequence[SO_0001621]': 0,
          'consequence[SO_0001818]': 0,
          'consequence[SO_0001819]': 0,
          'consequence[SO_0002012]': 0,
          'consequence[SO_0001587]': 0,
          'consequence[SO_0001578]': 0,
          'consequence[SO_0002019]': 0,
          'consequence[SO_0001567]': 0,
          'consequence[SO_0001624]': 0,
          'consequence[SO_0001623]': 0,
          'consequence[SO_0001627]': 0,
          'consequence[SO_0001792]': 0,
          'consequence[SO_0001619]': 0,
          'consequence[SO_0001574]': 0,
          'consequence[SO_0001575]': 0,
          'consequence[SO_0001630]': 0,
          'consequence[SO_0001893]': 0,
          'consequence[SO_0001889]': 0,
          'consequence[SO_0001620]': 0,
          'consequence[SO_0001894]': 0,
          'consequence[SO_0001891]': 0,
          'consequence[SO_0001566]': 0,
          'consequence[SO_0001782]': 0,
          'consequence[SO_0001895]': 0,
          'consequence[SO_0001892]': 0,
          'consequence[SO_0001632]': 0,
          'consequence[SO_0001628]': 0,
          'consequence[SO_0001631]': 0
        }
      end

      let :json do
        expect(subject).to be(200)

        expect(response.content_type).to eq('application/json; charset=utf-8')

        JSON.parse(response.body)
      end

      it 'returns data' do
        expect(json['data'].find { |x| x['id'] == 'tgv56616325' }).to be_present
      end
    end

    context 'with keyword and SIFT (Deleterious)' do
      subject { get '/search', params: params, headers: { Accept: 'application/json' } }

      let :params do
        {
          term: 'tgv56616325',
          'sift[T]': 0
        }
      end

      let :json do
        expect(subject).to be(200)

        expect(response.content_type).to eq('application/json; charset=utf-8')

        JSON.parse(response.body)
      end

      it 'returns data' do
        expect(json['data'].find { |x| x['id'] == 'tgv56616325' }).to be_present
      end
    end

    context 'with keyword and PolyPhen (Probably damaging)' do
      subject { get '/search', params: params, headers: { Accept: 'application/json' } }

      let :params do
        {
          term: 'tgv56616325',
          'polyphen[POSSD]': 0,
          'polyphen[B]': 0,
          'polyphen[U]': 0
        }
      end

      let :json do
        expect(subject).to be(200)

        expect(response.content_type).to eq('application/json; charset=utf-8')

        JSON.parse(response.body)
      end

      it 'returns data' do
        expect(json['data'].find { |x| x['id'] == 'tgv56616325' }).to be_present
      end
    end
  end

  describe 'POST /api/search/variant' do
    context 'without query' do
      subject { post '/api/search/variant', headers: { Accept: 'application/json', 'Content-Type': 'application/json' } }

      let :json do
        expect(subject).to be(200)

        expect(response.content_type).to eq('application/json; charset=utf-8')

        JSON.parse(response.body)
      end

      it 'returns expected keys' do
        expect(json.keys).to contain_exactly('data', 'scroll', 'statistics')
        expect(json['scroll'].keys).to contain_exactly('limit', 'offset', 'max_rows')
        expect(json['statistics'].keys).to contain_exactly('total', 'filtered', 'dataset', 'type', 'significance', 'consequence')
        case ENV['TOGOVAR_REFERENCE']
        when 'GRCh37'
          expect(json.dig('statistics', 'dataset').keys).to contain_exactly('gem_j_wga',
                                                                            'jga_ngs',
                                                                            'jga_snp',
                                                                            'tommo',
                                                                            'hgvd',
                                                                            'gnomad_genomes',
                                                                            'gnomad_exomes',
                                                                            'clinvar')
        when 'GRCh38'
          expect(json.dig('statistics', 'dataset').keys).to contain_exactly('gem_j_wga',
                                                                            'jga_ngs',
                                                                            'jga_snp',
                                                                            'tommo',
                                                                            'hgvd',
                                                                            'gnomad_genomes',
                                                                            'clinvar')
        else
          pending("TOGOVAR_REFERENCE is not set.")
        end
        expect(json.dig('statistics', 'type').keys).to contain_exactly('SO_0001483',
                                                                       'SO_0000159',
                                                                       'SO_0000667',
                                                                       'SO_1000002',
                                                                       'SO_1000032')
        expect(json.dig('statistics', 'significance').keys).to contain_exactly('NC',
                                                                               'US',
                                                                               'LB',
                                                                               'B',
                                                                               'P',
                                                                               'LP',
                                                                               'CI',
                                                                               'NP',
                                                                               'DR',
                                                                               'O',
                                                                               'RF',
                                                                               'A',
                                                                               'AF',
                                                                               'PR',
                                                                               'AN')
        expect(json.dig('statistics', 'consequence').keys).to contain_exactly('SO_0001627',
                                                                              'SO_0001619',
                                                                              'SO_0001621',
                                                                              'SO_0001628',
                                                                              'SO_0001624',
                                                                              'SO_0001792',
                                                                              'SO_0001583',
                                                                              'SO_0001819',
                                                                              'SO_0001782',
                                                                              'SO_0001623',
                                                                              'SO_0001630',
                                                                              'SO_0001589',
                                                                              'SO_0001587',
                                                                              'SO_0001575',
                                                                              'SO_0001574',
                                                                              'SO_0001822',
                                                                              'SO_0001821',
                                                                              'SO_0001578',
                                                                              'SO_0001895',
                                                                              'SO_0001580',
                                                                              'SO_0001567',
                                                                              'SO_0002012',
                                                                              'SO_0001818',
                                                                              'SO_0001620',
                                                                              'SO_0001626',
                                                                              'SO_0002019',
                                                                              'SO_0001893')
      end

      it 'returns data' do
        expect(json['data']).to_not be_empty
      end
    end

    context 'with id' do
      subject { post '/api/search/variant', params: body.to_json, headers: { Accept: 'application/json', 'Content-Type': 'application/json' } }

      let :body do
        {
          query: {
            id: [
              'tgv56616325'
            ]
          }
        }
      end

      let :json do
        expect(subject).to be(200)

        expect(response.content_type).to eq('application/json; charset=utf-8')

        JSON.parse(response.body)
      end

      it 'returns data' do
        expect((variant = json['data'].find { |x| x['id'] == 'tgv56616325' })).to be_present

        expect(variant.keys).to contain_exactly('id',
                                                'type',
                                                'chromosome',
                                                'position',
                                                'start',
                                                'stop',
                                                'reference',
                                                'alternate',
                                                'existing_variations',
                                                'symbols',
                                                'external_link',
                                                'significance',
                                                'most_severe_consequence',
                                                'sift',
                                                'polyphen',
                                                'alphamissense',
                                                'transcripts',
                                                'frequencies')
      end
    end

    context 'with id and type' do
      subject { post '/api/search/variant', params: body.to_json, headers: { Accept: 'application/json', 'Content-Type': 'application/json' } }

      let :body do
        {
          query: {
            and: [
              {
                id: [
                  'tgv56616325'
                ]
              },
              {
                type: {
                  relation: 'eq',
                  terms: [
                    'snv'
                  ]
                }
              }
            ]
          }
        }
      end

      let :json do
        expect(subject).to be(200)

        expect(response.content_type).to eq('application/json; charset=utf-8')

        JSON.parse(response.body)
      end

      it 'returns data' do
        expect(json['data'].find { |x| x['id'] == 'tgv56616325' }).to be_present
      end
    end

    context 'with gene' do
      subject { post '/api/search/variant', params: body.to_json, headers: { Accept: 'application/json', 'Content-Type': 'application/json' } }

      let :body do
        {
          query: {
            gene: {
              relation: 'eq',
              terms: [
                27091
              ]
            }
          }
        }
      end

      let :json do
        expect(subject).to be(200)

        expect(response.content_type).to eq('application/json; charset=utf-8')

        JSON.parse(response.body)
      end

      it 'returns data' do
        variant = json['data'].first
        expect(variant).to be_present

        gene = variant['symbols'].find { |x| x['id'] == 27091 }
        expect(gene['name']).to eq('SLC22A31')
      end
    end

    context 'with disease' do
      subject { post '/api/search/variant', params: body.to_json, headers: { Accept: 'application/json', 'Content-Type': 'application/json' } }

      let :body do
        {
          query: {
            disease: {
              relation: 'eq',
              terms: [
                'MONDO_0012933'
              ]
            }
          }
        }
      end

      let :json do
        expect(subject).to be(200)

        expect(response.content_type).to eq('application/json; charset=utf-8')

        JSON.parse(response.body)
      end

      it 'returns data' do
        variant = json['data'].first
        expect(variant).to be_present

        disease = variant['significance'].find { |x| x['medgen'] == 'C2675520' }
        expect(disease['condition']).to eq('Breast-ovarian cancer, familial, susceptibility to, 2')
      end
    end

    context 'with disease and significance' do
      subject { post '/api/search/variant', params: body.to_json, headers: { Accept: 'application/json', 'Content-Type': 'application/json' } }

      let :body do
        {
          query: {
            and: [
              {
                disease: {
                  relation: 'eq',
                  terms: [
                    'MONDO_0012933'
                  ]
                }
              },
              {
                significance: {
                  relation: 'eq',
                  terms: [
                    'P'
                  ]
                }
              }
            ]
          }
        }
      end

      let :json do
        expect(subject).to be(200)

        expect(response.content_type).to eq('application/json; charset=utf-8')

        JSON.parse(response.body)
      end

      it 'returns data' do
        variant = json['data'].first
        expect(variant).to be_present

        disease = variant['significance'].find { |x| x['medgen'] == 'C2675520' }
        expect(disease['condition']).to eq('Breast-ovarian cancer, familial, susceptibility to, 2')
        expect(disease['interpretations']).to include('P')
      end
    end
  end
end
