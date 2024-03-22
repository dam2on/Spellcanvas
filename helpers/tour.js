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
    const tourId = Tutorials.GamePiece;
    let isDemoPiece = false;
    if (piece == null) {
        isDemoPiece = true;
        // demo piece
        piece = new Piece(newGuid(), newGuid(), "Big Bad Evil Guy", "img/orc.png", 20, 0.1, 0.3); 
        piece.updateConditions('Stunned, Prone, Enraged');
        piece.duplicate = true;
        piece.aura = new Shape(piece.id, piece.owner, ShapeType.Circle, 45, piece.x, piece.y);
        piece.aura.contrastColor = invertColor(piece.aura.color);
        piece.aura.opacity = 127;
        await piece.updateImage();
        piece.draw();
        await CURRENT_SCENE.addPiece(piece);
    }

    const newGamePieceTour = new Shepherd.Tour({
        defaultStepOptions: {
            cancelIcon: {
                enabled: true
            },
            scrollTo: { behavior: 'smooth', block: 'center' }
        }
    });

    const cleanupTour = async function() {
        if (isDemoPiece) {
            CURRENT_SCENE.deletePiece(piece);
            CURRENT_SCENE.drawPieces();
        }
        bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('piece-menu')).hide();
        await markTutorialComplete(tourId);
    }

    newGamePieceTour.on('cancel', cleanupTour);
    newGamePieceTour.on('complete', cleanupTour);

    newGamePieceTour.addStep({
        title: 'Game Piece',
        text: 'Click & drag to move pieces. Right-click to view details!',
        buttons: [
            {
                async action() {
                    return this.cancel();
                },
                classes: 'shepherd-button-secondary',
                text: 'Skip Tutorial'
            },
            {
                action() {
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
        title: 'Piece Details',
        text: "Modify the name, size and other properties",
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
        text: 'Add buffs/debuffs to display on your game piece',
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
        text: 'Include an aura around your piece (i.e. Spirit Guardians) and adjust the color and size',
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
        text: 'Mark your piece as dead, hide the shadow border, or prevent it from being re-positioned',
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
                    $('label[for="checkbox-route-toggle"]').trigger('hover');
                    bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('piece-menu')).hide();
                    return this.complete();
                },
                text: 'Done!'
            }
        ]
    });

    if (!await isTutorialComplete(tourId)) {
        newGamePieceTour.start();
    }
}


const initMainMenuTour = async function (isHost = true) {
    const tourId = Tutorials.Main;

    const tour = new Shepherd.Tour({
        id: tourId,
        defaultStepOptions: {
            cancelIcon: {
                enabled: true
            },
            scrollTo: { behavior: 'smooth', block: 'center' }
        }
    });

    const cleanupTour = async function() {
        $('.menu-toggle').removeClass('blinking');
        await markTutorialComplete(tourId);
    }

    tour.on('cancel', cleanupTour);
    tour.on('complete', async function() {
        await cleanupTour();
        initGamePieceTour();
    });

    tour.addStep({
        title: 'Welcome to Spellcanvas!',
        text: 'Spellcanvas is a minimalistic, virtual tabletop designed for online play!',
        buttons: [
            {
                async action() {

                    return this.cancel();
                },
                classes: 'shepherd-button-secondary',
                text: "Skip Tutorial"
            },
            {
                action() {
                    bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('main-menu')).show();
                    return this.next();
                },
                text: "Let's Explore"
            }
        ]
    });


    if (isHost) {
        tour.addStep({
            title: 'Set Background',
            text: 'Upload an image to use as the background',
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
            ]
        });
    
        tour.addStep({
            title: "Grid Settings",
            text: "Dial in the size of your background's grid to ensure game pieces and spell shapes are to scale",
            attachTo: {
                element: document.getElementById('btn-grid-mode'),
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
        title: 'Add Game Piece',
        text: 'Upload your own images and turn them into interactive game pieces',
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
        ]
    });


    tour.addStep({
        title: 'Spell Ruler',
        text: 'Measure spell coverage and range. Click to make a spell shape permanent. Scroll to rotate lines & cones',
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
                    if (!isHost) {
                        $('.menu-toggle').addClass('blinking');
                        bootstrap.Offcanvas.getInstance(document.getElementById('main-menu')).hide();
                    }
                    return this.next();
                },
                text: 'Next'
            }
        ]
    });

    if (isHost) {
        tour.addStep({
            title: 'Scenes',
            text: "Change or create new scenes. Right-click for more options",
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
            text: "<p>Import/export session files to transfer progress between computers!</p><br/>Everything you do gets <strong>saved automatically</strong> to your browser. Clearing cookies or clicking the 'Clear Session' button will delete all saved data.",
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
                        bootstrap.Offcanvas.getInstance(document.getElementById('main-menu')).hide();
                        return this.next();
                    },
                    text: 'Next'
                }
            ]
        });
    }

    tour.addStep({
        title: 'Click Me!',
        text: 'Open settings',
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
        ]
    });

    tour.addStep({
        title: 'Or Click Me!',
        text: 'Open settings',
        attachTo: {
            element: document.getElementById("btn-menu-toggle"),
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
                    $("#btn-menu-toggle").trigger('mouseover');
                    return this.next();
                },
                text: 'Next'
            }
        ]
    });

    tour.addStep({
        id: 'sub-menu-step',
        title: 'Also, hover me for extra utilities!',
        text: '<i class="fa-solid fa-route"></i> Toggle lines showing recent moves<br/><i class="fa-solid fa-expand"></i> Toggle fullscreen mode<br/><i class="fa-solid fa-dice-five"></i> Dice roller',
        attachTo: {
            element: document.getElementById("btn-menu-toggle"),
            on: 'top'
        },
        buttons: [
            {
                action() {
                    setTimeout(function() {
                        $("#btn-menu-toggle").trigger('mouseleave');
                    }, 150);
                    $('.menu-toggle').addClass('blinking');
                    return this.back();
                },
                classes: 'shepherd-button-secondary',
                text: 'Back'
            },
            {
                action() {
                    setTimeout(function() {
                        $("#btn-menu-toggle").trigger('mouseleave');
                    }, 150);
                    return this.complete();
                },
                text: 'Next'
            }
        ]
    });

    if (!await isTutorialComplete(tourId)) {
        tour.start();
    }
}