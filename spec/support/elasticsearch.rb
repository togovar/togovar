require 'socket'

host, port = Rails.application.config.elasticsearch.host.match(/\A([a-zA-Z0-9-]+):(\d+)\z/).captures

listen = begin
           ::TCPSocket.open(host, port).close
           true
         rescue Errno::ECONNREFUSED
           false
         end

raise RuntimeError, "cannot connect to elasticsearch running on #{host}:#{port}" unless listen
