package notification

import (
	"encoding/json"
	"fmt"

	webpush "github.com/SherClockHolmes/webpush-go"

	"adhdoit/internal/config"
	"adhdoit/internal/db"
)

type PushPayload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	URL   string `json:"url"`
}

func SendWebPush(cfg *config.Config, sub *db.PushSubscription, todoTitle string) error {
	if cfg.VAPIDPublicKey == "" || cfg.VAPIDPrivateKey == "" {
		return nil // VAPID not configured
	}

	payload := PushPayload{
		Title: "ADHDoIt Reminder",
		Body:  fmt.Sprintf("Don't forget: %s", todoTitle),
		URL:   "/",
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	s := &webpush.Subscription{
		Endpoint: sub.Endpoint,
		Keys: webpush.Keys{
			P256dh: sub.P256dh,
			Auth:   sub.Auth,
		},
	}

	resp, err := webpush.SendNotification(data, s, &webpush.Options{
		VAPIDPublicKey:  cfg.VAPIDPublicKey,
		VAPIDPrivateKey: cfg.VAPIDPrivateKey,
		Subscriber:      cfg.VAPIDSubject,
		TTL:             30,
	})
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}
