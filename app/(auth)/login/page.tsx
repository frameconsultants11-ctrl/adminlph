"use client";

import {
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

import LoginForm from "@/components/auth/LoginForm";
export default function LoginPage() {
  return (
    <main
      className="
        min-h-screen
        font-sans
        bg-[#fbfbfb]
        p-2
        sm:p-3
        lg:p-4
      "
    >

      {/* OUTER FRAME */}

      <div
        className="
          mx-auto
          flex
          min-h-[calc(100vh-16px)]
          w-full
          overflow-hidden
          rounded-[28px]
          border
          border-white/80
          bg-[#f6f4f7]
          p-2
          shadow-[0_20px_70px_rgba(35,25,50,0.15)]

          sm:min-h-[calc(100vh-24px)]
          sm:p-3
          lg:p-3
        "
      >

        <div
          className="
            grid
            w-full
            grid-cols-1
            gap-2

            lg:grid-cols-[1.05fr_1fr]
          "
        >

          {/* =================================================
              LEFT HERO
          ================================================= */}

          <section
            className="
              relative
              hidden
              min-h-[650px]
              overflow-hidden
              rounded-[22px]
              lg:block
            "
          >

            {/* GRADIENT BACKGROUND */}

            <div
              className="
                absolute
                inset-0
                bg-gradient-to-br
                from-[#eefaf3]
                via-[#55cf2c]
                to-[#0aa45f]
              "
            />

            {/* PURPLE GLOW */}

            <div
              className="
                absolute
                -left-20
                top-[-80px]
                h-[420px]
                w-[420px]
                rounded-full
                bg-[#d5f0cb]
                blur-[90px]
              "
            />

            {/* PINK GLOW */}

            <div
              className="
                absolute
                left-[25%]
                top-[10%]
                h-[300px]
                w-[300px]
                rounded-full
                bg-[#ed7fc8]/40
                blur-[80px]
              "
            />

            {/* BLUE GLOW */}

            <div
              className="
                absolute
                bottom-[-100px]
                right-[-60px]
                h-[400px]
                w-[400px]
                rounded-full
                bg-[#bce5ff]/70
                blur-[100px]
              "
            />

            {/* HERO CONTENT */}

            <div
              className="
                relative
                z-10
                flex
                h-full
                flex-col
                justify-between
                p-8
                xl:p-10
              "
            >

              {/* TOP */}

              <div>


                {/* MAIN TITLE */}

                <h1
                  className="
                    mt-12
                    max-w-[560px]
                    text-[48px]
                    font-bold
                    leading-[0.92]
                    tracking-[-0.055em]
                    text-black
                    xl:text-[78px]
                  "
                >
                  Learn Per Hour
                </h1>

                <p
                  className="
                    mt-2
                    text-[16px]
                    font-medium
                    tracking-[0.01em]
                    text-black/65
                  "
                >
                  New way of learning
                </p>

              </div>

              {/* DECORATIVE ORB */}

              <div
                className="
                  pointer-events-none
                  absolute
                  left-[33%]
                  top-[36%]
                  h-[130px]
                  w-[130px]
                  rounded-full
                  border
                  border-white/60
                  bg-gradient-to-br
                  from-[#fff]
                  via-[#21a509]
                  to-[#50eca1]
                  shadow-[0_20px_60px_rgba(255,255,255,0.4)]
                  blur-[0.2px]
                "
              >

                <div
                  className="
                    absolute
                    left-[15px]
                    top-[12px]
                    h-[38px]
                    w-[70px]
                    rotate-[-18deg]
                    rounded-full
                    bg-white/70
                    blur-md
                  "
                />

              </div>

              {/* LOWER TEXT */}

              <div className="max-w-[480px]">

                <h2
                  className="
                    text-[26px]
                    font-bold
                    tracking-[-0.03em]
                    text-[#111]
                    xl:text-[28px]
                  "
                >
                  Intelligent AI Assistance
                </h2>

                <p
                  className="
                    mt-2
                    max-w-[450px]
                    text-[13px]
                    leading-5
                    text-[#424242]
                  "
                >
                  Experience smarter conversations
                  with AI-powered responses,
                  personalized insights & seamless
                  productivity across every
                  interaction.
                </p>

              </div>

            </div>

          </section>

          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <section
            className="
              flex
              min-h-[650px]
              flex-col
              gap-2
            "
          >

            {/* LOGIN CARD */}

            <div
              className="
                flex
                flex-1
                items-center
                justify-center
                rounded-[22px]
                bg-[#faf7fa]
                px-6
                py-10
                sm:px-10
                lg:px-12
              "
            >

              <div
                className="
                  w-full
                  max-w-[390px]
                "
              >


                {/* TITLE */}

                <h2
                  className="
                    text-[29px]
                    font-bold
                    leading-tight
                    tracking-[-0.04em]
                    text-[#111]
                  "
                >
                  Welcome Back
                </h2>

                <p
                  className="
                    mt-1
                    text-[12px]
                    text-[#999]
                  "
                >
                  Sign in to access your unified
                  inbox
                </p>

                {/* FORM */}

                <div className="mt-7">
                  <LoginForm />
                </div>

              </div>

            </div>

            {/* USERS CARD */}

            <div
              className="
                flex
                min-h-[78px]
                items-center
                rounded-[22px]
                bg-[#faf7fa]
                px-6
                sm:px-8
              "
            >

              {/* AVATARS */}

              <div className="flex items-center">

                <div
                  className="
                    relative
                    z-[4]
                    h-9
                    w-9
                    overflow-hidden
                    rounded-full
                    border-2
                    border-white
                    bg-gradient-to-br
                    from-[#c78a63]
                    to-[#40302a]
                  "
                />

                <div
                  className="
                    relative
                    z-[3]
                    -ml-2
                    h-9
                    w-9
                    rounded-full
                    border-2
                    border-white
                    bg-gradient-to-br
                    from-[#222]
                    to-[#777]
                  "
                />

                <div
                  className="
                    relative
                    z-[2]
                    -ml-2
                    h-9
                    w-9
                    rounded-full
                    border-2
                    border-white
                    bg-gradient-to-br
                    from-[#795548]
                    to-[#111]
                  "
                />

              </div>

              {/* USERS TEXT */}

              <div className="ml-3">

                <p
                  className="
                    text-[13px]
                    font-semibold
                    text-[#222]
                  "
                >
                  10 Million+ Users
                </p>

                <p
                  className="
                    text-[9px]
                    text-[#999]
                  "
                >
                  worldwide
                </p>

              </div>

              <ArrowUpRight
                size={16}
                className="
                  ml-auto
                  text-[#aaa]
                "
              />

            </div>

          </section>

        </div>

      </div>

    </main>
  );
}