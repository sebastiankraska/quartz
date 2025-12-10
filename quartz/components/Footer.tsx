import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/footer.scss"
import { version } from "../../package.json"
import { i18n } from "../i18n"
import visitCounterScript from "./scripts/visitCounter.inline"

interface Options {
  links: Record<string, string>
}

export default ((opts?: Options) => {
  const Footer: QuartzComponent = ({ displayClass, cfg }: QuartzComponentProps) => {
    const year = new Date().getFullYear()
    const links = opts?.links ?? []
    return (
      <footer class={`${displayClass ?? ""}`}>
        <p>
          {i18n(cfg.locale).components.footer.createdWith}{" "}
          <a href="https://quartz.jzhao.xyz/">Quartz v{version}</a> © {year}
        </p>
        <ul>
          {Object.entries(links).map(([text, link]) => (
            <li>
              <a href={link}>{text}</a>
            </li>
          ))}
        </ul>

        {/* Visit Counter */}
        <div
          id="visit-counter"
          style="display: flex; gap: 3px; flex-direction: column; align-items: center; margin-top: 1rem;"
        >
          <div class="visit-count" style="line-height: 1; font-size: 14px; color: #777;">
            Loading visit count...
          </div>
        </div>
      </footer>
    )
  }

  Footer.css = style
  Footer.afterDOMLoaded = visitCounterScript
  return Footer
}) satisfies QuartzComponentConstructor
