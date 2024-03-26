const peerJsOptions = isLocal() ? { debug: 1 } : {
    host: 'dndcombatapp-413415.uc.r.appspot.com',
    port: 443,
    path: '/',
    secure: true,
    debug: 0
}