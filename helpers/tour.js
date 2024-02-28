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
                text: 'Show me!'
            }
        ]
    });

    newGamePieceTour.addStep({
        title: 'Image',
        text: "Crop existing image or upload a new one!",
        attachTo: {
            element: document.getElementById('piece-menu-image-input').parentElement.parentElement,
            on: 'left'
        },
        buttons: [
            {
                action() {
                    return this.next();
                },
                text: 'Next'
            }
        ]
    });

    newGamePieceTour.addStep({
        title: 'Piece Details',
        text: "Modify the name, size and other properties.",
        attachTo: {
            element: document.getElementById('piece-menu-name').parentElement.parentElement,
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
        title: 'Status',
        text: 'Add buffs/debuffs to display on your game piece.',
        attachTo: {
            element: document.getElementById('piece-menu-status-conditions').parentElement.parentElement,
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
        title: 'Aura',
        text: 'Include an aura around your piece (i.e. Spirit Guardians).',
        attachTo: {
            element: document.getElementById('checkbox-piece-menu-aura').parentElement.parentElement,
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
        title: 'Other settings',
        text: 'Mark your piece as dead, prevent it from being re-positioned, or hide the shadow border.',
        attachTo: {
            element: document.getElementById('piece-menu-dead').parentElement.parentElement,
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
                    $('#btn-update-piece').addClass('shake');
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
                    $('#btn-update-piece').removeClass('shake');
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
        title: 'Welcome to Spellcanvas!',
        text: 'Spellcanvas is a minimalistic virtual tabletop intended to facilitate online play.',
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
        title: 'Manage Content',
        text: isHost ? 'Set your background and add interactive game pieces!' : 'Add interactive game pieces!',
        attachTo: {
            element: document.getElementById("btn-add-piece").parentElement,
            on: 'right'
        },
        buttons: [
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
            title: "Grid Size",
            text: "Dial in the size of your background's grid to ensure game pieces and spell areas are drawn to scale.",
            attachTo: {
                element: document.getElementById('btn-grid-mode').parentElement,
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
    }


    tour.addStep({
        title: 'Spell Ruler',
        text: 'Measure spell coverage and range. Left click to create a permanent & interactive spell area. Scroll to rotate lines & cones!',
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
            title: 'Manage Scenes',
            text: "Create, select, or delete scenes.",
            attachTo: {
                element: document.getElementById("scene-list"),
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
            title: 'Party',
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
                        return this.next();
                    },
                    text: 'Next'
                }
            ]
        });

        tour.addStep({
            title: 'Manage Sessions',
            text: 'Import/export session files to transfer progress between computers!',
            attachTo: {
                element: document.getElementById("btn-import-session"),
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
        text: 'Open settings',
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
        text: 'Open settings',
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
                    return this.next();
                },
                text: 'OK'
            }
        ]
    });

    tour.addStep({
        title: 'Toggle Routes',
        text: 'Hover or click me to show most recent piece positions',
        attachTo: {
            element: document.querySelector('label[for="checkbox-route-toggle"]'),
            on: 'top'
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