class StaticController < ApplicationController
  class << self
    def static_pages
      @static_pages ||= Dir[static_pages_path]
                          .map { |x| File.basename(x).split('.').first }
                          .uniq
                          .map(&:to_sym)
    end

    def static_pages_path
      relative_path = File.join('..', 'views', 'static', '**', '*.html*')
      File.expand_path(relative_path, File.dirname(__FILE__))
    end
  end

  before_action :set_locale, only: static_pages

  static_pages.each do |name|
    define_method(name) do
      render file: "static/#{@locale}/#{name}"
    end
  end

  include Downloads

  CACHE_KEY_DOWNLOAD_LIST = 'public::release::list'.freeze
  CACHE_KEY_LATEST_RELEASE = 'public::release::latest'.freeze

  def downloads
    if params.key?(:clear_cache)
      Rails.logger.info('Clearing cache of release')

      Rails.cache.delete CACHE_KEY_DOWNLOAD_LIST
      Rails.cache.delete CACHE_KEY_LATEST_RELEASE
    end

    @list = Rails.cache.fetch(CACHE_KEY_DOWNLOAD_LIST) { downloads_list }
    @latest_release = Rails.cache.fetch(CACHE_KEY_LATEST_RELEASE) { latest_release }

    render file: "static/#{@locale}/downloads"
  end

  private

  def set_locale
    @locale = cookies[:locale] = I18n.locale = locale
  end

  def locale
    locale_from_params || locale_from_cookie || locale_from_request || locale_from_default
  end

  def locale_from_params
    (l = params[:locale]).present? ? l.to_sym.presence_in(I18n.available_locales) : nil
  end

  def locale_from_cookie
    (l = cookies[:locale]).present? ? l.to_sym.presence_in(I18n.available_locales) : nil
  end

  def locale_from_request
    request
      .env['HTTP_ACCEPT_LANGUAGE'].to_s.split(',')
      .map { |x| x[0..1].to_sym }
      .select { |x| I18n.available_locales.include?(x) }
      .first
  end

  def locale_from_default
    I18n.default_locale
  end
end
