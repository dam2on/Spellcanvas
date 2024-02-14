const markTutorialComplete = async function(tutorialId) {
    let tutorial = await localforage.getItem(StorageKeys.Tutorial);
    if (tutorial == null) {
        tutorial = {};
    }
    tutorial[tutorialId] = true;
    await localforage.setItem(StorageKeys.Tutorial, tutorial);
}

const isTutorialComplete = async function(tutorialId) {
    return false; // remove after testing
    const tutorial = await localforage.getItem(StorageKeys.Tutorial);
    return !!(tutorial ?? {})[tutorialId];
}

const initGamePieceTour = async function(piece) {
    const tourId = 'gamePieceTour';

    const newGamePieceTour = new Shepherd.Tour({
        defaultStepOptions: {
            cancelIcon: {
                enabled: true
            },
            classes: 'class-1 class-2',
            scrollTo: { behavior: 'smooth', block: 'center' }
        }
    });

    newGamePieceTour.addStep({
        title: 'Game Piece',
        text: 'Click & drag to move a piece around. Right-click to view details!',
        // attachTo: {
        //     element: document.getElementById("canvas"),
        //     on: 'right'
        // },
        buttons: [
            {
                action() {
                    return this.back();
                },
                classes: 'shepherd-button-secondary',
                text: 'Back'
            },
            {
                action() {
                    piece.click();
                    Promise.resolve(markTutorialComplete(tourId));
                    return this.next();
                },
                text: 'OK'
            }
        ],
        id: 'creating'
    });

    $('#piece-menu').on('show.bs.offcanvas', async function() {
        // cancel tour if menu gets opened
        newGamePieceTour.cancel();
        await markTutorialComplete(tourId);
    });

    $('#canvas').on('mousedown', async function() {
        // cancel tour if menu gets opened
        newGamePieceTour.cancel();
        await markTutorialComplete(tourId);
    });

    if (!await isTutorialComplete(tourId)) {
        newGamePieceTour.start();
    }
}


const initMainMenuTour = async function (isHost = true) {
    let blinkingTimeout;
    const tourId = 'mainMenu';

    const tour = new Shepherd.Tour({
        defaultStepOptions: {
            cancelIcon: {
                enabled: true
            },
            classes: 'class-1 class-2',
            scrollTo: { behavior: 'smooth', block: 'center' }
        }
    });

    tour.addStep({
        title: 'Invite Players',
        text: 'Copy and send this link to invite players to your party!',
        attachTo: {
            element: document.getElementById("btn-copy-invite-link"),
            on: 'right'
        },
        buttons: [
            {
                action() {
                    return this.back();
                },
                classes: 'shepherd-button-secondary',
                text: 'Back'
            },
            {
                action() {
                    return this.next();
                },
                text: 'Next'
            }
        ],
        id: 'creating'
    });

    if (isHost) {
        tour.addStep({
            title: 'Current Party',
            text: 'Click party members to view more details!',
            attachTo: {
                element: document.getElementById("empty-party-msg"),
                on: 'right'
            },
            buttons: [
                {
                    action() {
                        return this.back();
                    },
                    classes: 'shepherd-button-secondary',
                    text: 'Back'
                },
                {
                    action() {
                        return this.next();
                    },
                    text: 'Next'
                }
            ],
            id: 'creating'
        });
    
        tour.addStep({
            title: 'Set Background',
            text: 'Upload an image or provide a YouTube video link to set as the background!',
            attachTo: {
                element: document.getElementById("btn-change-bg"),
                on: 'right'
            },
            buttons: [
                {
                    action() {
                        return this.back();
                    },
                    classes: 'shepherd-button-secondary',
                    text: 'Back'
                },
                {
                    action() {
                        return this.next();
                    },
                    text: 'Next'
                }
            ],
            id: 'creating'
        });
    }

    tour.addStep({
        title: 'Add Game Piece',
        text: 'Create interactive game pieces to represent NPCs, Players, or other elements!',
        attachTo: {
            element: document.getElementById("btn-add-piece"),
            on: 'right'
        },
        buttons: [
            {
                action() {
                    return this.back();
                },
                classes: 'shepherd-button-secondary',
                text: 'Back'
            },
            {
                action() {
                    return this.next();
                },
                text: 'Next'
            }
        ],
        id: 'creating'
    });

    tour.addStep({
        title: 'Area Range Checker',
        text: 'Useful for checking spell coverage!',
        attachTo: {
            element: document.getElementById("area-range-checker"),
            on: 'right'
        },
        buttons: [
            {
                action() {
                    return this.back();
                },
                classes: 'shepherd-button-secondary',
                text: 'Back'
            },
            {
                action() {
                    if (!isHost)
                        bootstrap.Offcanvas.getInstance(document.getElementById('main-menu')).hide();
                    return this.next();
                },
                text: 'Next'
            }
        ],
        id: 'creating'
    });

    if (isHost) {
        tour.addStep({
            title: 'Calibrate The Grid',
            text: 'Adjust the relative size of your game pieces. Make sure to re-calibrate everytime you change backgrounds!',
            attachTo: {
                element: document.getElementById("range-grid-size"),
                on: 'right'
            },
            buttons: [
                {
                    action() {
                        return this.back();
                    },
                    classes: 'shepherd-button-secondary',
                    text: 'Back'
                },
                {
                    action() {
                        return this.next();
                    },
                    text: 'Next'
                }
            ],
            id: 'creating'
        });
    
        tour.addStep({
            title: 'Clear Game Pieces',
            text: 'Delete all of the game pieces currently on the board',
            attachTo: {
                element: document.getElementById("btn-reset-pieces"),
                on: 'right'
            },
            buttons: [
                {
                    action() {
                        return this.back();
                    },
                    classes: 'shepherd-button-secondary',
                    text: 'Back'
                },
                {
                    action() {
                        bootstrap.Offcanvas.getInstance(document.getElementById('main-menu')).hide();
                        $('.menu-toggle').addClass('blinking');
                        return this.next();
                    },
                    text: 'Next'
                }
            ],
            id: 'creating'
        });
    }

    tour.addStep({
        title: 'Hover Me!',
        text: 'Open settings menu',
        attachTo: {
            element: document.querySelector(".menu-toggle"),
            on: 'right'
        },
        buttons: [
            {
                action() {
                    bootstrap.Offcanvas.getInstance(document.getElementById('main-menu')).show();
                    return this.back();
                },
                classes: 'shepherd-button-secondary',
                text: 'Back'
            },
            {
                action() {
                    $('.menu-toggle').removeClass('blinking');
                    return this.next();
                },
                text: 'Next'
            }
        ],
        id: 'creating'
    });

    tour.addStep({
        title: 'Or Click Me!',
        text: 'Open settings menu',
        attachTo: {
            element: document.querySelector("a.menu-btn"),
            on: 'top'
        },
        buttons: [
            {
                action() {
                    $('.menu-toggle').addClass('blinking');
                    return this.back();
                },
                classes: 'shepherd-button-secondary',
                text: 'Back'
            },
            {
                action() {
                    Promise.resolve(markTutorialComplete(tourId));
                    return this.next();
                },
                text: 'OK'
            }
        ],
        id: 'creating'
    });


    $('#main-menu').on('hide.bs.offcanvas', async function() {
        // cancel tour if menu is closed and not on the last step two steps
        if (tour.steps.indexOf(tour.currentStep) < tour.steps.length-2) {
            $('.menu-toggle').removeClass('blinking');
            tour.cancel();
            await markTutorialComplete(tourId);
        }
    });

    $('#main-menu').on('show.bs.offcanvas', async function() {
        // cancel tour if menu gets opened on last step
        if (tour.steps.indexOf(tour.currentStep) < tour.steps.length-2) {
            $('.menu-toggle').removeClass('blinking');
            tour.cancel();
            await markTutorialComplete(tourId);
        }
    });

    if (!await isTutorialComplete(tourId)) {
        bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('main-menu')).show();
        tour.start();
    }
}