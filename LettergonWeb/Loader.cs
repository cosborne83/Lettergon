using System.Configuration;
using System.Web.Hosting;
using Lettergon;

namespace LettergonWeb
{
    internal static class Loader
    {
        public static readonly LettergonGenerator Generator;

        static Loader()
        {
            var wordFile = ConfigurationManager.AppSettings["WordFile"];
            Generator = new LettergonGenerator(HostingEnvironment.MapPath(wordFile));
        }
    }
}