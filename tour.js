const newGamePieceTour = function() {
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
        title: 'Game Piece',
        text: 'Click & drag to move a piece around. Alternatively, right-click to view piece settings!',
        attachTo: {
            element: document.getElementById("canvas"),
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

    newGamePieceTour.start();
}

const initMainMenuTour = function (isHost = true) {
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
            element: document.getElementById("btn-copy-party-link"),
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
            text: 'See who has joined your party!',
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
            title: 'Change Background',
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
                        return this.next();
                    },
                    text: 'Next'
                }
            ],
            id: 'creating'
        });
    }

    tour.addStep({
        title: 'Toggle Settings Menu',
        text: 'Open up the settings menu!',
        attachTo: {
            element: document.querySelector("a.menu-btn"),
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
                    return this.next();
                },
                text: 'Done!'
            }
        ],
        id: 'creating'
    });


    $('#main-menu').on('hide.bs.offcanvas', function() {
        // cancel tour if menu is closed and not on the last step
        if (tour.currentStep != tour.steps[tour.steps.length-1]) {
            tour.cancel();
        }
    });

    tour.start();
}