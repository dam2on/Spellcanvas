const markTutorialComplete = async function (tutorialId) {
    let tutorial = await localforage.getItem(StorageKeys.Tutorial);
    if (tutorial == null) {
        tutorial = {};
    }
    tutorial[tutorialId] = true;
    await localforage.setItem(StorageKeys.Tutorial, tutorial);
}

const isTutorialComplete = async function (tutorialId) {
    const tutorial = await localforage.getItem(StorageKeys.Tutorial);
    return !!(tutorial ?? {})[tutorialId];
}

const initGamePieceTour = async function (piece) {
    let menuState = 'close'
    const tourId = 'gamePieceTour';

    const newGamePieceTour = new Shepherd.Tour({
        defaultStepOptions: {
            cancelIcon: {
                enabled: true
            },
            // classes: 'shepherd-enabled shepherd-target',
            scrollTo: { behavior: 'smooth', block: 'center' }
        }
    });

    newGamePieceTour.addStep({
        title: 'Game Piece',
        text: 'Click & drag to move pieces. Right-click to view details!',
        buttons: [
            {
                action() {
                    menuState = 'open';
                    piece.click();
                    return this.next();
                },
                text: 'OK'
            }
        ]
    });

    newGamePieceTour.addStep({
        title: 'Piece Details',
        text: "Modify the image, name, size and other properties.",
        attachTo: {
            element: document.getElementById('piece-menu-name'),
            on: 'left'
        },
        buttons: [
            {
                action() {
                    menuState = 'close';
                    bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('piece-menu')).hide();
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
        ]
    });

    newGamePieceTour.addStep({
        title: 'Conditions',
        text: 'Add different status conditions or mark your piece as dead.',
        attachTo: {
            element: document.getElementById('piece-menu-status-conditions').parentElement,
            on: 'left'
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
        ]
    });

    newGamePieceTour.addStep({
        title: 'Remember to save!',
        text: "Click 'Save' to apply your changes!",
        attachTo: {
            element: document.getElementById('btn-update-piece'),
            on: 'left'
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
                    menuState = 'close';
                    bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('piece-menu')).hide();
                    Promise.resolve(markTutorialComplete(tourId));
                    return this.next();
                },
                text: 'Done'
            }
        ]
    });

    $('#piece-menu').on('show.bs.offcanvas', async function () {
        if (menuState == 'close') {
            // cancel tour if menu gets opened
            newGamePieceTour.cancel();
            await markTutorialComplete(tourId);
        }
    });

    $('#piece-menu').on('hide.bs.offcanvas', async function () {
        if (menuState == 'open') {
            // cancel tour if menu gets opened
            newGamePieceTour.cancel();
            await markTutorialComplete(tourId);
        }
    });

    if (!await isTutorialComplete(tourId)) {
        newGamePieceTour.start();
    }
}


const initMainMenuTour = async function (isHost = true) {
    let menuState = 'close';
    const tourId = 'mainMenu';

    const tour = new Shepherd.Tour({
        defaultStepOptions: {
            cancelIcon: {
                enabled: true
            },
            scrollTo: { behavior: 'smooth', block: 'center' }
        }
    });

    tour.addStep({
        title: 'Welcome to SpellTable!',
        text: 'SpellTable is a multiplayer, virtual tabletop built with DnD in mind!',
        buttons: [
            {
                action() {
                    menuState = 'open';
                    bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('main-menu')).show();
                    return this.next();
                },
                text: "Let's Explore"
            }
        ]
    });

    tour.addStep({
        title: 'Game Board Controls',
        text: isHost ? 'Change your background and add interactive pieces!' : 'Add interactive pieces!',
        attachTo: {
            element: document.getElementById("btn-add-piece").parentElement,
            on: 'right'
        },
        buttons: [
            {
                action() {
                    menuState = 'close';
                    bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('main-menu')).hide();
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
        ]
    });

    tour.addStep({
        title: 'Spell Ruler',
        text: 'Measure spell coverage and range',
        attachTo: {
            element: document.getElementById('spell-ruler'),
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
        ]
    });

    if (isHost) {
        tour.addStep({
            title: 'Grid Size',
            text: 'Adjust this slider to match the width of the grid lines in your background. The size of game pieces and spell ruler will be adjusted accordingly.',
            attachTo: {
                element: document.getElementById('range-grid-size').parentElement,
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
            ]
        });



        tour.addStep({
            title: 'Party View',
            text: 'Invite players and view your current party',
            attachTo: {
                element: document.getElementById("section-party-menu"),
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
                        $('.menu-toggle').addClass('blinking');
                        menuState = 'close';
                        bootstrap.Offcanvas.getInstance(document.getElementById('main-menu')).hide();
                        return this.next();
                    },
                    text: 'Next'
                }
            ]
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
                    menuState = 'open';
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
        ]
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
        ]
    });


    $('#main-menu').on('hide.bs.offcanvas', async function () {
        // cancel tour if menu is closed and not on the last step two steps
        if (menuState != 'close') {
            $('.menu-toggle').removeClass('blinking');
            tour.cancel();
            await markTutorialComplete(tourId);
        }
    });

    $('#main-menu').on('show.bs.offcanvas', async function () {
        // cancel tour if menu gets opened on last step
        if (menuState != 'open') {
            $('.menu-toggle').removeClass('blinking');
            tour.cancel();
            await markTutorialComplete(tourId);
        }
    });

    if (!await isTutorialComplete(tourId)) {
        tour.start();
    }
}