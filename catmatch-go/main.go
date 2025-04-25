package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/launcher"
	"github.com/go-rod/rod/lib/proto"
)

func main() {
	// CLI flags
	downloadURLs := flag.Bool("download-urls", false, "Download cat listing URLs")
	grabData := flag.Bool("grab-data", false, "Grab data from cat listing URLs")
	maxURLs := flag.Int("max", 1000, "Maximum number of URLs to download")
	outputFile := flag.String("output", "cat_urls.json", "Output file for URLs")
	flag.Parse()

	if *downloadURLs {
		if err := scrapeCatListings(*maxURLs, *outputFile); err != nil {
			fmt.Fprintf(os.Stderr, "❌ Error: %v\n", err)
			os.Exit(1)
		}
	} else if *grabData {
		// Read cat_urls.json
		file, err := os.Open(*outputFile)
		if err != nil {
			fmt.Fprintf(os.Stderr, "❌ Error reading %s: %v\n", *outputFile, err)
			os.Exit(1)
		}
		defer file.Close()

		var urls []string
		if err := json.NewDecoder(file).Decode(&urls); err != nil {
			fmt.Fprintf(os.Stderr, "❌ Error decoding %s: %v\n", *outputFile, err)
			os.Exit(1)
		}

		if len(urls) == 0 {
			fmt.Println("No URLs found in the file.")
			os.Exit(1)
		}

		// Load existing data.json if present
		existing := make(map[string]bool)
		if dataFile, err := os.Open("data.json"); err == nil {
			defer dataFile.Close()
			dec := json.NewDecoder(dataFile)
			for {
				var entry map[string]interface{}
				if err := dec.Decode(&entry); err != nil {
					break
				}
				if u, ok := entry["url"].(string); ok {
					existing[u] = true
				}
			}
		}

		// Open data.json for appending
		dataFile, err := os.OpenFile("data.json", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err != nil {
			fmt.Fprintf(os.Stderr, "❌ Error opening data.json: %v\n", err)
			os.Exit(1)
		}
		defer dataFile.Close()
		encoder := json.NewEncoder(dataFile)

		fmt.Printf("Found %d URLs in %s\n", len(urls), *outputFile)
		fmt.Println("Scraping data from URLs...")

		for _, url := range urls {
			if existing[url] {
				fmt.Printf("⏩ Skipping already scraped: %s\n", url)
				continue
			}

			details, err := scrapeCatDetails(url)
			if err != nil {
				fmt.Fprintf(os.Stderr, "❌ Error scraping %s: %v\n", url, err)
				continue
			}

			details["url"] = url

			if err := encoder.Encode(details); err != nil {
				fmt.Fprintf(os.Stderr, "❌ Error writing JSON for %s: %v\n", url, err)
				continue
			}

			fmt.Printf("✅ Scraped and saved: %s\n", url)
		}

	} else {
		fmt.Println("No action taken. Use --download-urls to start scraping URLs or --grab-data to scrape data from URLs.")
	}
}

func scrapeCatDetails(url string) (map[string]interface{}, error) {
	fmt.Println("Scraping:", url)

	u := launcher.New().Headless(true).MustLaunch()
	browser := rod.New().ControlURL(u).MustConnect()
	defer browser.MustClose()

	page := browser.MustPage(url)
	page.MustWaitLoad().MustWaitStable()

	data := make(map[string]interface{})

	// Name
	if nameEl, err := page.Element("h1.pet-listing__content__name"); err == nil && nameEl != nil {
		data["name"] = strings.TrimSpace(nameEl.MustText())
	}

	// byline
	if bylineEl, err := page.Element("p.pet-listing__content__feature"); err == nil &&
		bylineEl != nil {
		data["byline"] = strings.TrimSpace(bylineEl.MustText())
	}

	// Location
	locationDivs, _ := page.Elements("div.tw-block")
	for _, block := range locationDivs {
		label, err := block.Element("div.tw-uppercase")
		if err == nil && label != nil {
			text := strings.TrimSpace(label.MustText())
			if strings.EqualFold(text, "Location") {
				fullText := strings.TrimSpace(block.MustText())
				location := strings.TrimSpace(strings.TrimPrefix(fullText, text))
				data["location"] = location
				break
			}
		}
	}
	if loc, ok := data["location"].(string); ok {
		parts := strings.Split(loc, ",")
		state := strings.TrimSpace(parts[len(parts)-1])
		data["location"] = state
	}

	// Interstate adoption states
	items, _ := page.Elements("li.c-listings-detail-table-item")

	for _, li := range items {
		textEl, err := li.Element("div.tw-text-sm")
		if err != nil || textEl == nil {
			continue
		}
		text := strings.TrimSpace(textEl.MustText())

		if strings.HasPrefix(text, "Interstate adoption") {
			start := strings.Index(text, "(")
			end := strings.Index(text, ")")
			if start != -1 && end != -1 && end > start {
				stateList := text[start+1 : end]
				states := strings.Split(stateList, ",")
				for i := range states {
					states[i] = strings.TrimSpace(states[i])
				}
				data["interstate_adoption_locations"] = states
				break
			}
		}
	}

	// Merge location + interstate states (deduplicated)
	locationRaw, hasLocation := data["location"].(string)
	interstateRaw, hasInterstate := data["interstate_adoption_locations"].([]string)

	if hasLocation && hasInterstate {
		locationParts := []string{strings.TrimSpace(locationRaw)}
		seen := make(map[string]bool)
		seen[locationRaw] = true

		for _, state := range interstateRaw {
			state = strings.TrimSpace(state)
			if state != "" && !seen[state] {
				locationParts = append(locationParts, state)
				seen[state] = true
			}
		}

		// Join everything into one string
		data["location"] = strings.Join(locationParts, ", ")
		// Optionally delete the raw list
		delete(data, "interstate_adoption_locations")
	}

	// Age
	ageDivs, _ := page.Elements("div.tw-block")
	for _, block := range ageDivs {
		label, err := block.Element("div.tw-uppercase")
		if err == nil && label != nil {
			text := strings.TrimSpace(label.MustText())
			if strings.EqualFold(text, "Age") {
				fullText := strings.TrimSpace(block.MustText())
				age := strings.TrimSpace(strings.TrimPrefix(fullText, text))
				data["age"] = age
				break
			}
		}
	}

	// Coat
	coatDivs, _ := page.Elements("div.tw-block")
	for _, block := range coatDivs {
		label, err := block.Element("div.tw-uppercase")
		if err == nil && label != nil {
			text := strings.TrimSpace(label.MustText())
			if strings.EqualFold(text, "Coat") {
				fullText := strings.TrimSpace(block.MustText())
				coat := strings.TrimSpace(strings.TrimPrefix(fullText, text))
				data["coat"] = coat
				break
			}
		}
	}

	// Images
	imgEls, _ := page.Elements("img.listings__photos__img")
	var imageURLs []string

	// Only the first image
	for _, img := range imgEls {
		src := img.MustProperty("src").String()
		if src != "" {
			imageURLs = append(imageURLs, src)
			break
		}
	}

	data["url"] = url

	data["images"] = imageURLs

	return data, nil
}

// scrapeCatListings scrapes cat listing URLs and writes them to a JSON file
func scrapeCatListings(maxURLs int, outputFile string) error {
	url := launcher.New().Headless(true).MustLaunch()
	browser := rod.New().ControlURL(url).MustConnect()
	defer browser.MustClose()

	page := browser.MustPage("https://www.petrescue.com.au/listings/search/cats?per_page=60")

	urlMap := make(map[string]bool)
	var allUrls []string

	for {
		page.MustWaitLoad()
		time.Sleep(3 * time.Second)

		anchors := page.MustElements("article a[href*='/listings/']")

		for _, a := range anchors {
			href := a.MustAttribute("href")
			if href != nil && !urlMap[*href] {
				urlMap[*href] = true
				allUrls = append(allUrls, *href)
				fmt.Println(*href)

				if len(allUrls) >= maxURLs {
					fmt.Printf("Reached max URL limit (%d)\n", maxURLs)
					return writeJSON(outputFile, allUrls)
				}
			}
		}

		links, err := page.Timeout(5 * time.Second).Elements("a")
		if err != nil {
			return fmt.Errorf("error finding links: %w", err)
		}

		var nextBtn *rod.Element
		for _, link := range links {
			text, _ := link.Text()
			if text != "" && equalFoldTrimmed(text, "Next") {
				nextBtn = link
				break
			}
		}

		if nextBtn == nil {
			fmt.Println("No more pages or 'Next' button not found")
			break
		}

		err = nextBtn.Click(proto.InputMouseButtonLeft, 1)
		if err != nil {
			return fmt.Errorf("error clicking next button: %w", err)
		}
	}

	return writeJSON(outputFile, allUrls)
}

func equalFoldTrimmed(a, b string) bool {
	return strings.EqualFold(strings.TrimSpace(a), b)
}

func writeJSON(filename string, data []string) error {
	file, err := os.Create(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(data); err != nil {
		return err
	}

	fmt.Printf("✅ Saved %d URLs to %s\n", len(data), filename)
	return nil
}
