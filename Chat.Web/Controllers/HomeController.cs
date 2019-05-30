using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Mvc;
using System.IO;
using Chat.Web.Helpers;
using Chat.Web.Hubs;
using Chat.Web.Models.ViewModels;
using Chat.Web.Models;
using System.Text.RegularExpressions;
using AutoMapper;
using System.Web;
using Microsoft.AspNet.Identity.Owin;

namespace Chat.Web.Controllers
{
    [Authorize]
    public class HomeController : Controller
    {
        private ApplicationSignInManager _signInManager;
        private ApplicationUserManager _userManager;
        private ApplicationUser _currentUser;
        private ProfileHelper _profileHelper;

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
                return _currentUser ?? _userManager.FindByNameAsync(System.Web.HttpContext.Current.User.Identity.Name).Result;
            }
            set
            {
                _currentUser = value;
            }
        }

        public ProfileHelper ProfileHelper
        {
            get
            {
                return _profileHelper ?? HttpContext.GetOwinContext().Get<ProfileHelper>();
            }
            private set
            {
                _profileHelper = value;
            }
        }

        //public HomeController(ProfileHelper profileHelper)
        //{
        //    _profileHelper = profileHelper;
        //}

        [AllowAnonymous]
        public ActionResult Index()
        {
            if (!User.Identity.IsAuthenticated)
                return RedirectToAction("Login", "Account");

            return View();
        }

        [HttpPost]
        public ActionResult Upload()
        {
            if (Request.Files.Count > 0)
            {
                try
                {
                    var file = Request.Files[0];

                    // Some basic checks...
                    if (file != null && !FileValidator.ValidSize(file.ContentLength))
                        return Json("File size too big. Maximum File Size: 500KB");
                    else if (!FileValidator.ValidType(file.ContentType))
                        return Json("This file extension is not allowed!");
                    else
                    {
                        // Save file to Disk
                        var fileName = DateTime.Now.ToString("yyyymmddMMss") + "_" + Path.GetFileName(file.FileName);
                        var filePath = Path.Combine(Server.MapPath("~/Content/uploads/"), fileName);
                        file.SaveAs(filePath);

                        string htmlImage = string.Format(
                            "<a href=\"/Content/uploads/{0}\" target=\"_blank\">" +
                            "<img src=\"/Content/uploads/{0}\" class=\"post-image\">" +
                            "</a>", fileName);

                        using (var db = new ApplicationDbContext())
                        {
                            // Get sender & chat room
                            var senderViewModel = ChatHub._Connections.Where(u => u.Username == User.Identity.Name).FirstOrDefault();
                            var sender = db.Users.Where(u => u.UserName == senderViewModel.Username).FirstOrDefault();
                            var room = db.Rooms.Where(r => r.Name == senderViewModel.CurrentRoom).FirstOrDefault();

                            // Build message
                            Message msg = new Message()
                            {
                                Content = Regex.Replace(htmlImage, @"(?i)<(?!img|a|/a|/img).*?>", String.Empty),
                                Timestamp = DateTime.Now.Ticks.ToString(),
                                FromUser = sender,
                                ToRoom = room
                            };

                            db.Messages.Add(msg);
                            db.SaveChanges();

                            // Send image-message to group
                            var messageViewModel = Mapper.Map<Message, MessageViewModel>(msg);
                            var hub = Microsoft.AspNet.SignalR.GlobalHost.ConnectionManager.GetHubContext<ChatHub>();
                            hub.Clients.Group(senderViewModel.CurrentRoom).newMessage(messageViewModel);
                        }

                        return Json("Success");
                    }

                }
                catch (Exception ex)
                { return Json("Error while uploading" + ex.Message); }
            }

            return Json("No files selected");

        } // Upload

        public ActionResult Offline()
        {
            return View();
        }

        public JsonResult GetRooms()
        {
            var rooms = ProfileHelper.GetRooms();
            return new JsonResult
            {
                Data = rooms,
                JsonRequestBehavior = JsonRequestBehavior.AllowGet
            };
        }

        [HttpGet]
        public JsonResult GetMessageHistory(string roomName)
        {
            var messages = ProfileHelper.GetMessageHistory(roomName);
            return new JsonResult
            {
                Data = messages,
                JsonRequestBehavior = JsonRequestBehavior.AllowGet
            };
        }

        public JsonResult GetProfileInfo()
        {
            var profile = ProfileHelper.GetProfileInfo();
            return new JsonResult
            {
                Data = profile,
                JsonRequestBehavior = JsonRequestBehavior.AllowGet
            };
        }

    }
}