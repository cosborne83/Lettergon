using Lettergon;
using System.Configuration;
using System.Net;
using System.Net.WebSockets;
using System.Threading;
using System.Web;
using System.Web.Hosting;
using System.Web.Http;

namespace LettergonWeb.Controllers
{
    [RoutePrefix("api/puzzle")]
    public class PuzzleController : ApiController
    {
        private static readonly LettergonGenerator Generator;
        private static readonly RoomManager RoomManager;

        static PuzzleController()
        {
            var wordFile = ConfigurationManager.AppSettings["WordFile"];
            Generator = new LettergonGenerator(HostingEnvironment.MapPath(wordFile));
            RoomManager = new RoomManager(Generator);
        }

        [Route]
        public Puzzle Get()
        {
            return Generator.CreatePuzzle(7, 4);
        }


        [Route("{pangramLength}/{minWordLength}")]
        public Puzzle Get(int pangramLength, int minWordLength)
        {
            return Generator.CreatePuzzle(pangramLength, minWordLength);
        }

        [Route("join/{roomName}/{playerName}")]
        public IHttpActionResult Get(string roomName, string playerName)
        {
            var context = HttpContext.Current;
            if (!context.IsWebSocketRequest) return BadRequest();

            var joinStatus = RoomManager.TryJoinRoom(context, roomName, playerName);
            if (joinStatus != JoinStatus.Success)
            {
                context.AcceptWebSocketRequest(c =>
                {
                    WebSocketCloseStatus closeStatus;
                    string closeMessage;
                    switch (joinStatus)
                    {
                        case JoinStatus.NameInUse:
                            closeStatus = (WebSocketCloseStatus)4000;
                            closeMessage = "Player name already in use";
                            break;
                        case JoinStatus.RoomFull:
                            closeStatus = (WebSocketCloseStatus)4001;
                            closeMessage = "Room full";
                            break;
                        default:
                            closeStatus = WebSocketCloseStatus.InternalServerError;
                            closeMessage = string.Empty;
                            break;
                    }

                    return c.WebSocket.CloseAsync(closeStatus, closeMessage, new CancellationTokenSource(5000).Token);
                });
            }

            return StatusCode(HttpStatusCode.SwitchingProtocols);
        }
    }
}
