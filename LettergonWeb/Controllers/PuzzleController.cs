﻿using Lettergon;
using System.Web.Http;

namespace LettergonWeb.Controllers
{
    [RoutePrefix("api/puzzle")]
    public class PuzzleController : ApiController
    {
        private static readonly LettergonGenerator Generator;

        static PuzzleController()
        {
            Generator = Loader.Generator;
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
