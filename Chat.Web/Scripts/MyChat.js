$(function () {
    const chatRoomKey = "chat-room-key";
    const warningOptions = {
        "closeButton": true,
        "debug": false,
        "newestOnTop": false,
        "progressBar": false,
        "positionClass": "toast-top-center",
        "preventDuplicates": false,
        "onclick": null,
        "showDuration": "300",
        "hideDuration": "1000",
        "timeOut": "5000",
        "extendedTimeOut": "1000",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut"
    };

    var chatHub = $.connection.chatHub;
    $.connection.hub.start().done(function () {
        var roomName = localStorage.getItem(chatRoomKey) || "Lobby";
        model.userList();
        model.joinRoom(roomName);
    });

    // Client Operations
    chatHub.client.newMessage = function (messageView) {
        var isMine = messageView.From === model.myName();
        var message = new ChatMessage(messageView.Content,
            messageView.Timestamp,
            messageView.From,
            isMine,
            messageView.Avatar);
        model.chatMessages.push(message);
        console.log('[chatHub.client.newMessage]', messageView.Avatar);
        $(".chat-body").animate({ scrollTop: $(".chat-body")[0].scrollHeight }, 1000);
    };

    chatHub.client.addUser = function (user) {
        model.userAdded(new ChatUser(user.Username,
            user.DisplayName,
            user.Avatar,
            user.CurrentRoom,
            user.Device));
    };

    chatHub.client.removeUser = function (user) {
        model.userRemoved(user.Username);
    };

    chatHub.client.addChatRoom = function (room) {
        model.roomAdded(new ChatRoom(room.Id, room.Name));
    };

    chatHub.client.removeChatRoom = function (room) {
        model.roomDeleted(room.Id);
    };

    chatHub.client.onError = function (message) {
        toastr.options = warningOptions;
        toastr["warning"](message);
    };

    chatHub.client.onRoomDeleted = function (message) {
        toastr.options = warningOptions;
        toastr["warning"](message);

        // Join to the first room in list
        $("ul#room-list li a")[0].click();
    };

    var Model = function () {
        var self = this;
        self.message = ko.observable("");
        self.chatRooms = ko.observableArray([]);
        self.chatUsers = ko.observableArray([]);
        self.chatMessages = ko.observableArray([]);
        self.joinedRoom = ko.observable("");
        self.serverInfoMessage = ko.observable("");
        self.myName = ko.observable("");
        self.myAvatar = ko.observable("");
        self.onEnter = function (d, e) {
            if (e.keyCode === 13) {
                self.sendNewMessage();
            }
            return true;
        }
        self.filter = ko.observable("");
        self.filteredChatUsers = ko.computed(function () {
            if (!self.filter()) {
                return self.chatUsers();
            } else {
                return ko.utils.arrayFilter(self.chatUsers(), function (user) {
                    var displayName = user.displayName().toLowerCase();
                    return displayName.includes(self.filter().toLowerCase());
                });
            }
        });

    };

    Model.prototype = {

        // Server Operations
        sendNewMessage: function () {
            var self = this;
            if (self.message() === undefined || self.message() === null || self.message() === "")
                return;
            try {
                chatHub.server.send(self.joinedRoom, self.message()).done(function (res) {
                    self.message("");
                });
            }
            catch (err) {
                toastr.options = warningOptions;
                toastr["warning"]('No connection');
            }
        },

        joinRoom: function (roomName) {
            var self = this;
            self.joinedRoom = roomName;
            try {
                chatHub.server.join(self.joinedRoom).done(function () {
                    self.userList();
                });
            }
            catch (err) {
                console.log('Error ocured. ', err);
            }
            actions.getMessageHistory(self.joinedRoom);
            localStorage.setItem(chatRoomKey, self.joinedRoom);
        },

        userList: function () {
            var self = this;
            chatHub.server.getUsers(self.joinedRoom).done(function (result) {
                self.chatUsers.removeAll();
                for (var i = 0; i < result.length; i++) {
                    self.chatUsers.push(new ChatUser(result[i].Username,
                        result[i].DisplayName,
                        result[i].Avatar,
                        result[i].CurrentRoom,
                        result[i].Device))
                }
            });

        },

        createRoom: function () {
            var name = $("#roomName").val();
            chatHub.server.createRoom(name);
        },

        deleteRoom: function () {
            var self = this;
            chatHub.server.deleteRoom(self.joinedRoom);
        },

        roomAdded: function (room) {
            var self = this;
            self.chatRooms.push(room);
        },

        roomDeleted: function(id){
            var self = this;
            var temp;
            ko.utils.arrayForEach(self.chatRooms(), function (room) {
                if (room.roomId() == id)
                    temp = room;
            });
            self.chatRooms.remove(temp);
        },

        userAdded: function (user) {
            var self = this;
            self.chatUsers.push(user)
        },

        userRemoved: function (id) {
            var self = this;
            var temp;
            ko.utils.arrayForEach(self.chatUsers(), function (user) {
                if (user.userName() == id)
                    temp = user;
            });
            self.chatUsers.remove(temp);
        },
    };

    // Represent server data
    function ChatRoom(roomId, name) {
        var self = this;
        self.roomId = ko.observable(roomId);
        self.name = ko.observable(name);
    }

    function ChatUser(userName, displayName, avatar, currentRoom, device) {
        var self = this;
        self.userName = ko.observable(userName);
        self.displayName = ko.observable(displayName);
        self.avatar = ko.observable(avatar);
        self.currentRoom = ko.observable(currentRoom);
        self.device = ko.observable(device);
    }

    function ChatMessage(content, timestamp, from, isMine, avatar) {
        var self = this;
        self.content = ko.observable(content);
        self.timestamp = ko.observable(timestamp);
        self.from = ko.observable(from);
        self.isMine = ko.observable(isMine);
        self.avatar = ko.observable(avatar);
    }

    $('ul#room-list').on('click', 'a', function () {
        var roomName = $(this).text();
        model.joinRoom(roomName);
        model.chatMessages.removeAll();
        $("input#iRoom").val(roomName);
        $("#joinedRoom").text(roomName);
        $('#room-list a').removeClass('active');
        $(this).addClass('active');
    });

    $('#sendMessage').on('click', function () {
        console.log('Sending message');
        model.sendNewMessage();
    });

    $('#logout').on('click', function () {
        $.connection.hub.stop();
        $('#logoutForm').submit();
    })

    var model = new Model();
    ko.applyBindings(model);

    function init() {
        actions.getProfileInfo();
        actions.getRooms();
    }

    var actions = {
        getProfileInfo: function () {
            $.ajax({
                type: "GET",
                url: '/Home/GetProfileInfo',
                data: {},
                contentType: false,
                processData: false,
                success: function (response) {
                    console.log('[getProfileInfo] Username', response.Username);
                    console.log('[getProfileInfo] Avatar', response.Avatar);
                    model.myName(response.DisplayName);
                    model.myAvatar(response.Avatar);
                },
                error: function (error) {
                    console.log('[getProfileInfo]. Error', error.done);
                }
            }).done(response => console.log('[getProfileInfo.Outer]', response));
        },
        getRooms: function () {
            $.ajax({
                type: "GET",
                url: '/Home/GetRooms',
                data: {},
                contentType: false,
                processData: false,
                success: function (response) {
                    model.chatRooms.removeAll();
                    for (var i = 0; i < response.length; i++) {
                        model.chatRooms.push(new ChatRoom(response[i].Id, response[i].Name));
                    }
                    $('.rooms').css('height', (window.innerHeight - 110) + 'px');
                },
                error: function (error) {
                    console.log('[getProfileInfo]. Error', error.done);
                }
            }).done(response => console.log('[getProfileInfo.Outer]', response));
        },
        getMessageHistory: function (roomName) {
            var data = JSON.stringify({ 'roomName': roomName });
            console.log(data);
            $.ajax({
                type: "GET",
                url: '/Home/GetMessageHistory?roomName=' + roomName,
                data: data,
                contentType: false,
                processData: false,
                success: function (response) {
                    console.log(response);
                    model.chatMessages.removeAll();
                    for (var i = 0; i < response.length; i++) {
                        var isMine = response[i].From == model.myName();
                        model.chatMessages.push(new ChatMessage(response[i].Content,
                            response[i].Timestamp,
                            response[i].From,
                            isMine,
                            response[i].Avatar))
                    }

                    $(".chat-body").animate({ scrollTop: $(".chat-body")[0].scrollHeight }, 1000);
                },
                error: function (error) {
                    console.log('[getProfileInfo]. Error', error.done);
                }
            }).done(response => console.log('[getProfileInfo.Outer]', response));
        }
    }

    init();

    //$(function () {
    //    if ('serviceWorker' in navigator) {
    //        window.addEventListener('load', () => {
    //            navigator.serviceWorker.register('service-worker.js')
    //                .then((reg) => {
    //                    console.log('Service worker registered.', reg);
    //                });
    //        });
    //    }
    //})
});