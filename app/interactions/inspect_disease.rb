class InspectDisease < ActiveInteraction::Base
  string :node, default: nil

  def execute
    results = DiseaseMondo.search(query: { match: { mondo: node || 'MONDO_0000001' } }, sort: 'mondo').results

    ret = if node.nil? || node == 'MONDO_0000001'
            {
              id: 'MONDO_0000001',
              cui: 'C0012634',
              label: 'Disease or disorder',
              root: true,
            }
          elsif (result = results.first).present?
            {
              id: (id = result.dig(:_source, :mondo)),
              cui: result.dig(:_source, :cui),
              label: result.dig(:_source, :label),
            }.tap { |hash| hash.merge!(root: true) if id == 'MONDO_0000001' }
             .tap { |hash| hash.merge!(leaf: true) if DiseaseMondo.count(body: { query: { match: { parent: id } } }).zero? }
          else
            return {}
          end

    parents = results.map do |r|
      parent = r.dig(:_source, :parent)
      if parent == 'MONDO_0000001'
        {
          id: 'MONDO_0000001',
          cui: 'C0012634',
          label: 'Disease or disorder',
          root: true,
        }
      elsif (x = DiseaseMondo.search(query: { match: { mondo: parent } }, size: 100).results.first)
        {
          id: (id = x.dig(:_source, :mondo)),
          cui: x.dig(:_source, :cui),
          label: x.dig(:_source, :label),
        }.tap { |hash| hash.merge!(root: true) if id == 'MONDO_0000001' }
      end
    end.compact

    children = DiseaseMondo.search(query: { match: { parent: node || 'MONDO_0000001' } }, sort: 'mondo', size: 100).results.map do |r|
      {
        id: (id = r.dig(:_source, :mondo)),
        cui: r.dig(:_source, :cui),
        label: r.dig(:_source, :label),
      }.tap { |hash| hash.merge!(leaf: true) if DiseaseMondo.count(body: { query: { match: { parent: id } } }).zero? }
    end

    ret.merge(parents: parents, children: children)
  end
end
