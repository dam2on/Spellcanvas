window.onload = function () {
    setTimeout(() => {
        const inviteLink = $('#host-frame').contents().find('#input-invite-link').val();
        $('#player-frame').attr('src', inviteLink);
        setTimeout(() => {
            const playerNameField = $('#player-frame').contents().find('#input-player-name');
            playerNameField.val('test');
            $('#player-frame').contents().find('#form-modal-player').trigger('submit');
        }, 2000);
    }, 2000);
}