module.exports = {
    devServer: {// Environment configuration
        //host: '0.0.0.0',
        //public:'rpi4id0.mooo.com:3000',
        client: {
            webSocketURL: 'auto://0.0.0.0:3000/ws'
        },
        port: 3000,
        https: false,
        hot: false,
        allowedHosts: 'all',
        open: true // Configure to automatically start the browser.
    }
}
