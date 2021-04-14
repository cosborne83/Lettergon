using Lettergon;
using System.Configuration;
using System.Net;
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

            if (!RoomManager.TryJoinRoom(context, roomName, playerName))
            {
                return BadRequest("Player name already in use");
            }

            return StatusCode(HttpStatusCode.SwitchingProtocols);
        }
    }
}
