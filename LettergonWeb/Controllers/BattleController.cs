using System.Configuration;
using System.Net;
using System.Net.WebSockets;
using System.Threading;
using System.Web;
using System.Web.Http;

namespace LettergonWeb.Controllers
{
    [RoutePrefix("api/battle")]
    public class BattleController : ApiController
    {
        public static readonly RoomManager RoomManager;

        static BattleController()
        {
            var maxPlayersPerRoomValue = ConfigurationManager.AppSettings["MaxPlayersPerRoom"];
            var maxPlayersPerRoom = int.TryParse(maxPlayersPerRoomValue, out var parsedValue) && parsedValue > 0
                ? parsedValue
                : 8;

            RoomManager = new RoomManager(Loader.Generator, maxPlayersPerRoom);
        }

        [Route("join/{roomName}/{playerName}")]
        public IHttpActionResult Get(string roomName, string playerName)
        {
            var context = HttpContext.Current;
            if (!context.IsWebSocketRequest) return BadRequest();
            if (roomName?.Length > 16) return BadRequest("Room name too long");
            if (playerName?.Length > 16) return BadRequest("Player name too long");
            if (string.IsNullOrWhiteSpace(roomName)) return BadRequest("Invalid room name");
            if (string.IsNullOrWhiteSpace(playerName)) return BadRequest("Invalid player name");
            roomName = roomName.Trim();
            playerName = playerName.Trim();

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