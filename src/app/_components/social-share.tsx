"use client";

import { useEffect, useState } from "react";

export function SocialShare({ title }: { title: string }) {
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const encodedUrl = encodeURIComponent(currentUrl);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="mt-8 -mb-7 pt-2 border-t border-gray-700">
      <h3 className="text-base font-bold mb-2 font-mono text-gray-200">Share this post</h3>
      <div className="flex gap-4 items-center flex-wrap text-gray-400">
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
          aria-label="Share on Facebook"
        >
          <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
            <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
          </svg>
        </a>

        <a
          href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
          aria-label="Share on X"
        >
          <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>

        <a
          href={`https://bsky.app/intent/compose?text=${encodedTitle}%20${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
          aria-label="Share on Bluesky"
        >
          <svg fill="currentColor" viewBox="0 0 600 530" className="w-5 h-5">
            <path d="M300 245c-30-75-110-200-190-225 0 80 40 160 130 185-110 0-150-60-150-60 0 90 60 175 170 175-30 20-65 30-110 30 70 50 160 55 230 20 70 35 160 30 230-20-45 0-80-10-110-30 110 0 170-85 170-175 0 0-40 60-150 60 90-25 130-105 130-185-80 25-160 150-190 225" />
          </svg>
        </a>

        <a
          href={`https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
          aria-label="Share on Reddit"
        >
          <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.688-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
          </svg>
        </a>

        <a
          href={`https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
          aria-label="Share on Pinterest"
        >
          <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
            <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
          </svg>
        </a>

        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
          aria-label="Share on LinkedIn"
        >
          <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </a>

        <a
          href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
          aria-label="Share on WhatsApp"
        >
          <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
            <path d="M12.031 0C5.394 0 0 5.395 0 12.031c0 2.27.632 4.414 1.777 6.273L.548 24l5.856-1.535C8.164 23.511 10.05 24 12.031 24 18.665 24 24 18.665 24 12.031 24 5.394 18.665 0 12.031 0zm0 21.986c-1.896 0-3.725-.503-5.322-1.455l-.382-.227-3.951 1.036 1.056-3.85-.25-.398C2.263 15.556 1.71 13.827 1.71 12.031 1.71 6.335 6.335 1.712 12.031 1.712c5.696 0 10.318 4.623 10.318 10.319S17.727 21.986 12.031 21.986zm5.666-7.75c-.31-.155-1.838-.908-2.126-1.011-.287-.104-.496-.155-.705.155-.209.31-.8 1.011-.98 1.218-.182.207-.365.232-.675.077-1.392-.693-2.454-1.272-3.414-2.83-.247-.393-.246-.388.064-.694.137-.136.31-.362.464-.543.155-.181.206-.31.31-.518.103-.207.051-.389-.026-.544-.077-.155-.705-1.701-.966-2.33-.255-.615-.515-.532-.705-.542-.182-.01-.39-.011-.599-.011-.21 0-.549.078-.836.388-.287.31-1.096 1.071-1.096 2.611s1.123 3.029 1.278 3.236c.155.207 2.206 3.366 5.344 4.717.747.322 1.33.514 1.785.658.75.239 1.433.205 1.97.124.602-.091 1.838-.751 2.096-1.476.258-.725.258-1.346.18-1.476-.076-.129-.286-.207-.595-.362z" />
          </svg>
        </a>

        <a
          href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
          aria-label="Share via Email"
        >
          <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
            <path d="M0 4.6l12 7.7 12-7.7V4a2 2 0 0 0-2-2H2a2 2 0 0 0-2 2v.6zM24 6.8l-12 7.7L0 6.8V20a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V6.8z" />
          </svg>
        </a>
      </div>
    </div>
  );
}
