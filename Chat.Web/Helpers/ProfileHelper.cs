using Chat.Web.Models.ViewModels;
using System.Collections.Generic;
using AutoMapper;
using Chat.Web.Models;
using System.Linq;
using System.Threading.Tasks;
using System;
using System.Web;
using Microsoft.AspNet.Identity.Owin;
using Microsoft.Owin;

namespace Chat.Web.Helpers
{
    public class ProfileHelper: IDisposable
    {
        private ApplicationSignInManager _signInManager;
        private ApplicationUserManager _userManager;
        private ApplicationUser _currentUser;
        private HttpContext _httpContext;
        public HttpContext HttpContext
        {
            get
            {
                return _httpContext ?? HttpContext.Current;
            }
            set
            {
                _httpContext = value;
            }
        }

        public ApplicationSignInManager SignInManager
        {
            get
            {
                return _signInManager ?? HttpContext.GetOwinContext().Get<ApplicationSignInManager>();
            }
            private set
            {
                _signInManager = value;
            }
        }

        public ApplicationUserManager UserManager
        {
            get
            {
                return _userManager ?? HttpContext.GetOwinContext().GetUserManager<ApplicationUserManager>();
            }
            private set
            {
                _userManager = value;
            }
        }

        public ApplicationUser CurrentUser
        {
            get
            {
                return _currentUser ?? UserManager.FindByNameAsync(System.Web.HttpContext.Current.User.Identity.Name).Result;
            }
            set
            {
                _currentUser = value;
            }
        }

        public static ProfileHelper Create(IdentityFactoryOptions<ProfileHelper> options, IOwinContext context)
        {
            return new ProfileHelper();
        }

        public IEnumerable<RoomViewModel> GetRooms()
        {
            using (var db = new ApplicationDbContext())
            {
                var rooms = new List<RoomViewModel>();

                foreach (var room in db.Rooms)
                {
                    var roomViewModel = Mapper.Map<Room, RoomViewModel>(room);
                    rooms.Add(roomViewModel);
                }

                return rooms;
            }
        }

        public IEnumerable<MessageViewModel> GetMessageHistory(string roomName)
        {
            using (var db = new ApplicationDbContext())
            {
                var messageHistory = db.Messages.Where(m => m.ToRoom.Name == roomName)
                    .OrderByDescending(m => m.Timestamp)
                    .Take(20)
                    .AsEnumerable()
                    .Reverse()
                    .ToList();

                return Mapper.Map<IEnumerable<Message>, IEnumerable<MessageViewModel>>(messageHistory);
            }
        }

        public UserViewModel GetProfileInfo()
        {
            using (var db = new ApplicationDbContext())
            {
                try
                {
                    var user = db.Users.Where(u => u.UserName == CurrentUser.UserName).FirstOrDefault();

                    var userViewModel = Mapper.Map<ApplicationUser, UserViewModel>(user);
                    userViewModel.Device = GetDevice();
                    userViewModel.CurrentRoom = "";

                    return userViewModel;
                }
                catch (Exception)
                {
                    // Swallow
                    return null;
                }
            }
        }

        public async Task SetUser(string login, string password)
        {
            CurrentUser = await UserManager.FindAsync(login, password);
        }

        private string GetDevice()
        {
            return "Web";
        }

        public void Dispose()
        {
            
        }
    }
}