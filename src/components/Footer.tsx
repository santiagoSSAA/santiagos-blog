import { Github, Twitter, Youtube } from "lucide-react";
import { NewsletterForm } from "@/components/NewsletterForm";

const socialLinks = [
  { href: "https://twitter.com", icon: Twitter, label: "Twitter" },
  { href: "https://github.com", icon: Github, label: "GitHub" },
  { href: "https://youtube.com", icon: Youtube, label: "YouTube" },
];

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <NewsletterForm />

          <div className="flex flex-col items-start md:items-end justify-between gap-4">
            <div className="flex gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <link.icon size={20} />
                </a>
              ))}
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              &copy; 2026 Santiago. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
