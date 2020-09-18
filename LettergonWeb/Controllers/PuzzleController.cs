using System.Configuration;
using System.Web.Hosting;
using System.Web.Http;
using Lettergon;

namespace LettergonWeb.Controllers
{
    [RoutePrefix("api/puzzle")]
    public class PuzzleController : ApiController
    {
        private static readonly LettergonGenerator Generator;

        static PuzzleController()
        {
            var wordFile = ConfigurationManager.AppSettings["WordFile"];
            Generator = new LettergonGenerator(HostingEnvironment.MapPath(wordFile));
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
    }
}
