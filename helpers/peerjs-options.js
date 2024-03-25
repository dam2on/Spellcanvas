const peerJsOptions = isLocal() ? {} : {
    host: 'dndcombatapp-413415.uc.r.appspot.com',
    port: 443,
    path: '/',
    secure: true,
    debug: 0
}