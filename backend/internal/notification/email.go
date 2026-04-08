package notification

import (
	"fmt"
	"net/smtp"
	"strings"

	"adhdo-it/internal/config"
)

func SendReminderEmail(cfg *config.Config, toEmail, toName, todoTitle string) error {
	if cfg.SMTPHost == "" {
		return nil // SMTP not configured, skip silently
	}

	auth := smtp.PlainAuth("", cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPHost)

	subject := fmt.Sprintf("Reminder: %s", todoTitle)
	body := fmt.Sprintf("Hi %s,\n\nThis is your reminder for: %s\n\n— ADHDoIt", toName, todoTitle)

	msg := strings.Join([]string{
		fmt.Sprintf("From: %s", cfg.SMTPFrom),
		fmt.Sprintf("To: %s", toEmail),
		fmt.Sprintf("Subject: %s", subject),
		"Content-Type: text/plain; charset=UTF-8",
		"",
		body,
	}, "\r\n")

	addr := fmt.Sprintf("%s:%s", cfg.SMTPHost, cfg.SMTPPort)
	return smtp.SendMail(addr, auth, cfg.SMTPUser, []string{toEmail}, []byte(msg))
}
