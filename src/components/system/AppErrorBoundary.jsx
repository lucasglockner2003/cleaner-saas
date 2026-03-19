import React from "react";

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      message: ""
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unexpected application error."
    };
  }

  componentDidCatch(error, info) {
    // Keep browser console visibility for production incident triage.
    // eslint-disable-next-line no-console
    console.error("AppErrorBoundary", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="loading-screen">
          <h2>Something went wrong</h2>
          <p className="muted">{this.state.message || "Unexpected application error."}</p>
          <div className="inline-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                this.setState({
                  hasError: false,
                  message: ""
                });
                window.location.assign("/");
              }}
            >
              Reload app
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>
              Hard refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
