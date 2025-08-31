function registration() {
  return `
    <div class="container">
      <form action="/register" method="POST">
        <img src="/static/svg/registerleft.svg" alt="Register Image" />
        <h2>Please enter your details</h2>
        <h1>Join the community!</h1>

        <div class="formfield">
          <label for="username">User Name</label>
          <input
            type="text"
            name="username"
            id="username"
            minlength="3"
            maxlength="32"
            placeholder="Your username"
            required
          />
        </div>

        <div class="formfield">
          <label for="email">Email</label>
          <input
            type="email"
            name="email"
            id="email"
            minlength="6"
            maxlength="254"
            placeholder="Your email"
            required
          />
        </div>

        <div class="formfield">
          <label for="password">Password</label>
          <input
            type="password"
            name="password"
            id="password"
            minlength="8"
            maxlength="72"
            placeholder="Create a password"
            required
          />
        </div>

        <div class="formfield">
          <label for="confirm_password">Confirm Password</label>
          <input
            type="password"
            name="confirm_password"
            id="confirm_password"
            minlength="8"
            maxlength="72"
            placeholder="Confirm your password"
            required
          />
        </div>

        <div class="error-container" style="color: rgb(255, 35, 35); display: none;" id="error"></div>

        <input type="submit" value="Register" />

        <p>Already have an account? <a href="/login">Login here</a></p>
      </form>
    </div>
  `;
}
