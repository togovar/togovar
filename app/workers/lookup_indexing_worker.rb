class LookupIndexingWorker
  include Sidekiq::Worker

  sidekiq_options queue: :lookup, retry: 5

  def perform(*id)
    errors = Lookup.import(*id)
    Sidekiq.logger.error(errors) unless errors.empty?
  end
end
