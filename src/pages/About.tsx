import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { mediaUrl } from "../api";
export default function About() {
  return (
    <>
      <section className="container about-hero">
        <div>
          <h1>
            Many cultures.
            <br />
            One hungry
            <br />
            <span>Malaysia.</span>
          </h1>
          <p>
            From the first kopi of the morning to the last supper stop, food is
            how we find our people.
          </p>
          <p>
            Makanlah is a place to discover Malaysian food, share the meals that
            stay with you, and help someone else find their next favourite bite.
          </p>
          <Link className="btn" to="/discover">
            Find your next bite
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="about-collage">
          <img
            className="about-main"
            src={mediaUrl("/assets/roti.jpg")}
            alt="Roti canai, a Malaysian breakfast favourite"
          />
          <img src={mediaUrl("/assets/cendol.jpg")} alt="A refreshing Malaysian cendol" />
          <img src={mediaUrl("/assets/noodles.jpg")} alt="Char kway teow with wok hei" />
        </div>
      </section>
      <section className="about-story">
        <div className="container">
          <h2>
            A little platform.
            <br />A big appetite for connection.
          </h2>
          <div>
            <p>
              We believe good food deserves to be found — whether it’s a
              family-run kopitiam, a neighbourhood mamak, or a tiny stall doing
              one thing beautifully.
            </p>
            <p>
              Here, everyone can pull up a chair. Browse the food around you,
              follow your tastes, and pass on a recommendation that makes
              someone’s day.
            </p>
            <p>
              For the people behind the food, Makanlah offers a place to tell
              your story, share your menu, and welcome your next customer.
            </p>
          </div>
        </div>
      </section>
      <section className="container nextgen-section">
        <div>
          <h2>
            Built by Nextgen Tech.
            <br />
            Made for every kind of makan.
          </h2>
          <p>
            Makanlah is developed by <strong>Nextgen Tech</strong> to bring
            Malaysian food to everyone. We’re building a meeting place for food
            lovers and the merchants who feed our communities.
          </p>
          <p>
            A space for discovery, a place for shared experiences, and a little
            more connection through food.
          </p>
          <Link className="text-link" to="/community">
            Meet the community
            <ArrowRight size={18} />
          </Link>
        </div>
        <img
          src={mediaUrl("/assets/city.jpg")}
          alt="The skyline of George Town, Penang"
          loading="lazy"
        />
      </section>
      <section className="about-cta">
        <div className="container">
          <h2>
            There’s always room
            <br />
            for one more.
          </h2>
          <Link to="/sign-in?mode=register" className="btn">
            Come join the table
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
